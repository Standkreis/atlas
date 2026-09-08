// Regenerate the committed raster exports from the organisation's canonical vector mark and locale copy.
// Run from app/: npm run brand:assets. No network requests or image-generation service required.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import opentype from 'opentype.js'

const root = new URL('../', import.meta.url)
const at = (path) => new URL(path, root)
// Outline text from the bundled faces so PNG and SVG exports never depend on installed system fonts.
const fonts = {}
for (const [face, weight] of [['Regular', 400], ['SemiBold', 600], ['Bold', 700]]) {
  const data = await readFile(at(`src/styles/fonts/TitilliumWeb-${face}.ttf`))
  fonts[weight] = opentype.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
}
const textPath = (text, x, y, size, weight = 400, color = '#1e2a23', tracking = 0) => {
  const path = fonts[weight].getPath(text, x, y, size, { kerning: true, letterSpacing: tracking / size })
  const points = { M: ['x', 'y'], L: ['x', 'y'], Q: ['x1', 'y1', 'x', 'y'], C: ['x1', 'y1', 'x2', 'y2', 'x', 'y'], Z: [] }
  const d = path.commands.map((command) => command.type + points[command.type].map((key) => {
    const value = command[key]
    if (!Number.isFinite(value)) throw new Error(`Invalid glyph coordinate in ${text}`)
    return +value.toFixed(2)
  }).join(' ')).join(' ')
  return `<path fill="${color}" d="${d}"/>`
}
await mkdir(at('public/brand'), { recursive: true })
const source = await readFile(at('public/brand/standkreis-mark.svg'), 'utf8')
const mark = source.replace(/<svg[^>]*>|<\/svg>/g, '').trim()
const whiteMark = mark.replaceAll('#1e2a23', '#ffffff')
const svg = (body, width = 512, height = width) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>\n`
const icon = (rounded) => svg(`<rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#16a34a"/><g transform="translate(76 76) scale(10)">${whiteMark}</g>`)

await writeFile(at('public/icon.svg'), icon(true))
for (const [file, size, rounded] of [
  ['brand/atlas-icon-192.png', 192, true],
  ['brand/atlas-icon-512.png', 512, true],
  ['brand/atlas-icon-maskable.png', 512, false],
  ['apple-touch-icon.png', 180, false],
]) {
  await sharp(Buffer.from(icon(rounded))).resize(size, size).png().toFile(at(`public/${file}`).pathname)
}

const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const wrap = (text, length) => text.split(' ').reduce((lines, word) => {
  const last = lines.length - 1
  if (last >= 0 && `${lines[last]} ${word}`.length <= length) lines[last] += ` ${word}`
  else lines.push(word)
  return lines
}, [])

for (const locale of ['de', 'en']) {
  const copy = JSON.parse(await readFile(at(`src/i18n/${locale}.json`), 'utf8'))
  const headline = wrap(copy.onboarding.headline, 23)
  const body = wrap(copy.onboarding.promise, 47)
  const card = svg(`
    <title>${escape(copy.app.shareAlt)}</title>
    <rect width="1200" height="630" fill="#f5f2ea"/>
    <rect x="824" y="32" width="344" height="566" rx="32" fill="#1e2a23"/>
    <g transform="translate(64 68) scale(1.25)">${mark}</g>
    ${textPath('Standkreis', 125, 99, 30, 600, '#1e2a23', -0.6)}
    ${textPath('Atlas', 125 + fonts[600].getAdvanceWidth('Standkreis', 30, { letterSpacing: -0.6 / 30 }) + 12, 99, 30)}
    ${headline.map((line, i) => textPath(line, 64, 246 + i * 70, 60, 700, '#1e2a23', -1.8)).join('')}
    ${body.map((line, i) => textPath(line, 64, 393 + i * 36, 25, 400, '#5b675f')).join('')}
    ${textPath('atlas.standkreis.de', 64, 559, 21, 400, '#15803d')}
    <g transform="translate(870 180) scale(7)">${whiteMark}</g>
    ${textPath('Atlas', 996 - fonts[400].getAdvanceWidth('Atlas', 28) / 2, 480, 28, 400, '#dcf5e3')}
  `, 1200, 630)
  await writeFile(at(`public/brand/atlas-share-${locale}.svg`), card)
  await sharp(Buffer.from(card)).png().toFile(at(`public/brand/atlas-share-${locale}.png`).pathname)
}
console.log('Generated Atlas app icons and German/English share cards from the Standkreis mark.')
