import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicDir = join(root, 'public')
const svgPath = join(publicDir, 'icon.svg')
const svg = readFileSync(svgPath)

for (const size of [192, 512]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, `icon-${size}.png`))
  console.log(`Generated public/icon-${size}.png`)
}
