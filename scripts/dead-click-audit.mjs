// Dead-click audit: clicks every visible interactive element on each screen (fresh load per click)
// and reports the ones that change nothing — no navigation, no DOM change, no new dialog.
//   node scripts/dead-click-audit.mjs 2.3 3.2 ...   (or no args = every built screen in /screens)
//   --width=375 to audit the phone layout instead of 1440×900. --json writes design/out/dead-clicks.json
// Needs the dev server on http://localhost:5173.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const width = Number(args.find((a) => a.startsWith('--width='))?.split('=')[1] ?? 1440)
const height = width < 768 ? 812 : 900
const asJson = args.includes('--json')
let ids = args.filter((a) => !a.startsWith('--'))
const base = 'http://localhost:5173'
const url = (id) => `${base}${id === '1.1' ? '/' : `/s/${id}`}`
const SELECTOR =
  'button:not([disabled]), a[href], [role=button], [role=tab], [role=menuitem], [role=option], [role=switch], [role=checkbox], [role=radio], input[type=checkbox], input[type=radio], summary, [draggable=true]'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768 })
if (!ids.length) {
  const p = await ctx.newPage()
  await p.goto(`${base}/screens`, { waitUntil: 'networkidle' })
  ids = await p.$$eval('a.text-accent', (as) => as.map((a) => a.textContent.split(' · ')[0].trim()))
  await p.close()
}

const page = await ctx.newPage()
const snapshot = () =>
  page.evaluate(() => ({ url: location.pathname + location.search, html: document.body.innerHTML }))

const report = {}
let totalDead = 0
for (const id of ids) {
  await page.goto(url(id), { waitUntil: 'networkidle' })
  const labels = await page.$$eval(SELECTOR, (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      const visible = r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
      const label = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.getAttribute('value') || el.tagName)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60)
      return { visible, label }
    }),
  )
  const dead = []
  for (let i = 0; i < labels.length; i++) {
    if (!labels[i].visible) continue
    await page.goto(url(id), { waitUntil: 'networkidle' })
    const before = await snapshot()
    const el = (await page.$$(SELECTOR))[i]
    if (!el) continue
    try {
      await el.click({ timeout: 1500 })
    } catch {
      dead.push(`${labels[i].label} (not clickable: covered or off-screen)`)
      continue
    }
    await page.waitForTimeout(250)
    const after = await snapshot()
    if (after.url === before.url && after.html === before.html) dead.push(labels[i].label)
  }
  const unique = [...new Set(dead)]
  totalDead += unique.length
  report[id] = unique
  console.log(`${id.padEnd(12)} ${unique.length ? `${unique.length} dead: ${unique.join(' | ')}` : 'all clicks do something'}`)
}
await browser.close()
if (asJson) fs.writeFileSync(path.resolve(import.meta.dirname, '../design/out/dead-clicks.json'), JSON.stringify(report, null, 2))
console.log(`\n${totalDead} dead clickable elements across ${ids.length} screens at ${width}px`)
