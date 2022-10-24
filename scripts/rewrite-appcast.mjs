import process from "node:process"
import fs from "node:fs/promises"

const urlFileNameRegexp = /(?<=url=")https?:\/\/.*?\/(.+?)(?=")/g
const itemSeparationRegexp = /<\/item>\s*<item>/
const releaseTagRegexp = /(?<=<title>)\d.+(?=<\/title>)/g
const tagPlaceholder = "{{ tag }}"

const appcastFilePath = process.argv[2]

let appcast = await fs.readFile(appcastFilePath, { encoding: "utf8" })

// Replace the file URLs with Github release download URLs
appcast = appcast.replace(urlFileNameRegexp, (_, fileName) => {
  fileName = encodeURIComponent(decodeURIComponent(fileName).replace(" ", "-"))
  return `https://github.com/${process.env.GITHUB_REPOSITORY}/releases/download/${tagPlaceholder}/${fileName}`
})

// Replace the tag placeholders with their corresponding tag
const [itemSeparation] = appcast.match(itemSeparationRegexp)
appcast = appcast
  .split(itemSeparation)
  .map(item => {
    const [releaseTag] = item.match(releaseTagRegexp)
    return item.replaceAll(tagPlaceholder, releaseTag)
  })
  .join(itemSeparation)

await fs.writeFile(appcastFilePath, appcast, { encoding: "utf8" })
