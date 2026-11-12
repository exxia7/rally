// Pixel-diff built screens against their Figma renders.
//   node scripts/pixel-diff.mjs 1.1 2.3 ...      (or no args = every id that has design/ref/<id>.png)
// Needs the dev server on http://localhost:5173 (npm run dev). References are 1440×900 PNGs from
// Figma's get_screenshot at design/ref/<id>.png. Writes design/out/<id>.app.png and <id>.diff.png.
import { chromium } from '@playwright/test'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const refDir = path.join(root, 'design/ref')
const outDir = path.join(root, 'design/out')
fs.mkdirSync(outDir, { recursive: true })

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(refDir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)).sort()

const browser = await chromium.launch()
// Reduced motion: every animation is off, so a frame renders exactly its Figma state.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
const rows = []
for (const id of ids) {
  const refPath = path.join(refDir, `${id}.png`)
  if (!fs.existsSync(refPath)) { rows.push([id, 'no reference']); continue }
  await page.goto(`http://localhost:5173${id === '1.1' ? '/' : `/s/${id}`}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)
  const appBuf = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } })
  fs.writeFileSync(path.join(outDir, `${id}.app.png`), appBuf)
  const ref = PNG.sync.read(fs.readFileSync(refPath))
  const app = PNG.sync.read(appBuf)
  if (ref.width !== 1440 || ref.height !== 900) { rows.push([id, `reference is ${ref.width}×${ref.height}, expected 1440×900`]); continue }
  const diff = new PNG({ width: 1440, height: 900 })
  const n = pixelmatch(ref.data, app.data, diff.data, 1440, 900, { threshold: 0.1, includeAA: false })
  fs.writeFileSync(path.join(outDir, `${id}.diff.png`), PNG.sync.write(diff))
  rows.push([id, `${((n / (1440 * 900)) * 100).toFixed(2)}% pixels differ (${n})`])
}
await browser.close()
for (const [id, msg] of rows) console.log(`${id.padEnd(12)} ${msg}`)
