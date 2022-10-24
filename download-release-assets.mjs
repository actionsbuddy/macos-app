import process from "node:process"
import fs from "node:fs/promises"

const releaseTag = process.argv[2]
const githubToken = process.argv[3]

const endpoint = new URL(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/releases`)
const headers = githubToken ? { authorization: `Bearer ${githubToken}` } : {}

function getNextPageUrl(response) {
  const links = response.headers.get("Link")?.split(",") || []
  for (const link of links) {
    const parts = link.split(";").map(p => p.trim())
    if (parts.length < 2) continue
    if (!parts[0].startsWith("<") || !parts[0].endsWith(">")) continue

    let url
    try {
      url = new URL(parts[0].slice(1, -1))
    } catch (_) {
      continue
    }

    for (const parameter of parts.slice(1)) {
      let [name, value] = parameter.split("=", 2)
      value = value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value
      if (name !== "rel") continue

      if (value === "next") {
        return url
      }
    }
  }
  return null
}

const releaseId = await (async () => {
  const response = await fetch(new URL(`tags/${releaseTag}`, endpoint), { headers })
  const data = await response.json()
  return data.id
})()
console.log(`Latest release ID: ${releaseId}`)

const nextUrl = endpoint
while (nextUrl) {
  const response = await fetch(nextUrl)
  const releases = await response.json()
  for (const release of releases) {
    for (const asset of release.assets) {
      if (asset.content_type === "application/zip") {
        console.log(`Downloading ${asset.name} from release ${release.tag_name}...`)
        const response = await fetch(asset.browser_download_url)
        const data = await response.arrayBuffer()
        const filename = `actions-buddy-${release.tag_name}.zip`
        await fs.writeFile(filename, new DataView(data))
        console.log(`Saved to ${filename}`)
      }
    }
  }
  nextUrl = null
  // nextUrl = getNextPageUrl(response)
}
