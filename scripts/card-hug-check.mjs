// Checks that every plan-map helper card hugs its content (nothing hangs out of the card) at 1440 and 1920 wide.
//   node scripts/card-hug-check.mjs [ids…]     (default: every planning-map frame)
// A card overflows when its content is taller than its box (scrollHeight > clientHeight). Needs the dev server.
import { chromium } from '@playwright/test'

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['2.3', '2.4', '2.4b', '2.4b-full', '2.4c', '2.4d', '2.4e', '2.5', '2.6', '2.7', '2.8']
const browser = await chromium.launch()
let bad = 0
for (const width of [1440, 1920]) {
  const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 900 : 1080 } })
  for (const id of ids) {
    await page.goto(`http://localhost:5173/s/${id}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const res = await page.evaluate(() =>
      [...document.querySelectorAll('[data-helper-card]')].map((el) => ({
        name: el.querySelector('p')?.textContent ?? '?',
        over: el.scrollHeight - el.clientHeight,
      }))
    )
    const over = res.filter((r) => r.over > 1)
    bad += over.length
    console.log(`${String(width).padEnd(5)} ${id.padEnd(10)} ${res.length} cards  ${over.length ? 'OVERFLOW ' + over.map((o) => `${o.name} +${o.over}px`).join(', ') : 'ok'}`)
  }
  await page.close()
}
await browser.close()
if (bad) process.exitCode = 1
