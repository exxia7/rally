// Responsive smoke test: loads routes at phone → large-desktop widths, saves screenshots and flags
// horizontal page overflow (content wider than the viewport).
//   node scripts/responsive-check.mjs 1.1 3.2 ...   (or no args = every built screen in /screens)
// Needs the dev server on http://localhost:5173. Writes design/out/<id>@<width>.png.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'design/out')
fs.mkdirSync(outDir, { recursive: true })
const SIZES = [[375, 812], [768, 1024], [1024, 768], [1280, 800], [1920, 1080]]
const url = (id) => `http://localhost:5173${id === '1.1' ? '/' : `/s/${id}`}`

const browser = await chromium.launch()
let ids = process.argv.slice(2)
if (!ids.length) {
  const p = await browser.newPage()
  await p.goto('http://localhost:5173/screens', { waitUntil: 'networkidle' })
  ids = await p.$$eval('a.text-accent', (as) => as.map((a) => a.textContent.split(' · ')[0].trim()))
  await p.close()
}
let problems = 0
for (const id of ids) {
  const cols = []
  for (const [w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 })
    await page.goto(url(id), { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    await page.screenshot({ path: path.join(outDir, `${id}@${w}.png`) })
    const ok = sw <= iw
    if (!ok) problems++
    cols.push(`${w}:${ok ? 'ok' : `OVERFLOW +${sw - iw}px`}`)
    await page.close()
  }
  console.log(`${id.padEnd(12)} ${cols.join('  ')}`)
}
await browser.close()
if (problems) process.exitCode = 1
