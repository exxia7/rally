// Temporary: framer-motion checks (reduced motion, live run captures, plan edit, fps).
import { chromium } from '@playwright/test'
const OUT = '/private/tmp/claude-501/motion-fm'
const browser = await chromium.launch()
const errors = []
const watch = (p) => { p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && errors.push(m.text())) }
const mutations = (page, ms) => page.evaluate((ms) => new Promise((res) => {
  let n = 0; const o = new MutationObserver((l) => { n += l.length })
  o.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'd', 'cx', 'cy', 'stroke-dashoffset'] })
  setTimeout(() => { o.disconnect(); res(n) }, ms)
}), ms)

// 1. Reduced motion: nothing moves on still frames.
const rp = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); watch(rp)
for (const id of ['3.2', '4.1', '4.3', '2.3', '3.3']) {
  await rp.goto(`http://localhost:5173/s/${id}?speed=hold`, { waitUntil: 'networkidle' })
  await rp.waitForTimeout(300)
  console.log(`reduce ${id}: style mutations in 1.5s = ${await mutations(rp, 1500)}, css animations = ${await rp.evaluate(() => document.getAnimations().length)}`)
}
// Reduced, live: after a beat change settles, nothing keeps moving
await rp.goto('http://localhost:5173/s/2.3?speed=fast', { waitUntil: 'networkidle' })
await rp.getByRole('button', { name: /Start launch|^Start$/ }).first().click()
await rp.waitForURL((u) => u.pathname === '/s/4.1', { timeout: 30000 })
await rp.waitForTimeout(200)
console.log(`reduce live 4.1 (after hand raise): mutations in 1.5s = ${await mutations(rp, 1500)}`)

// 2. Motion: direct load first paint; mutations show only loops.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' }); watch(page)
await page.goto('http://localhost:5173/s/4.1?speed=hold', { waitUntil: 'networkidle' })
await page.screenshot({ path: `${OUT}/direct-4.1-first-paint.png` })

// 3. Live run at normal speed + fps
await page.goto('http://localhost:5173/s/2.3?speed=normal', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /Start launch|^Start$/ }).first().click()
const t0 = Date.now()
const beat = () => page.evaluate(() => { const s = window.__pathfinder.store.get(); return s.workflows[s.activeId].run.beat })
let i = 0
const shot = async (tag) => { const b = await beat(); await page.screenshot({ path: `${OUT}/run-${String(i++).padStart(2, '0')}-${b}-${tag}.png` }) }
const fps = page.evaluate(() => new Promise((res) => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 3000) requestAnimationFrame(f); else res(n / 3) }; requestAnimationFrame(f) }))
for (const t of [600, 1800, 3650, 3850, 4200, 7150, 7350, 7700, 9000, 12050, 12250, 12600]) { const w = t - (Date.now() - t0); if (w > 0) await page.waitForTimeout(w); await shot(`${t}ms`) }
console.log('fps during launch beats (rAF/s):', (await fps).toFixed(1))
// Long tasks during running beat
// 4. Chat typing: open the panel on the running hand-raise? use 3.2 hold with panel
await page.goto('http://localhost:5173/s/3.2?speed=hold', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /panel/i }).first().click().catch(() => {})
await page.waitForTimeout(80)
await page.screenshot({ path: `${OUT}/panel-open-80ms.png` })
await page.getByRole('tab', { name: 'Chat' }).click().catch((e) => console.log('no chat tab', e.message.split('\n')[0]))
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/chat-typing.png` })

// 5. Plan edit: insert a step on a line, mid-glide shots
await page.goto('http://localhost:5173/s/2.3', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
const plus = page.getByRole('button', { name: 'Add a step between Strategist and Writer' })
await plus.focus(); await plus.click({ force: true })
await page.waitForTimeout(250)
await page.getByRole('button', { name: /Fact-checker/ }).first().click({ timeout: 3000 }).catch((e) => console.log('pick', e.message.split('\n')[0]))
for (const t of [80, 200, 700]) { await page.waitForTimeout(t === 80 ? 80 : t === 200 ? 120 : 500); await page.screenshot({ path: `${OUT}/plan-insert-${t}ms.png` }) }
// Modal / menu
console.log('errors', errors.slice(0, 5))
await browser.close()
