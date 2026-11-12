// Layout bug sweep: loads screens at phone / tablet / desktop sizes and flags the small UX bugs a pixel diff can't
// see on states Figma never drew:
//   spill    – a box whose content overflows it while overflow is visible (wrapped rows hanging over the next thing)
//   overlap  – two pieces of text, or two controls, drawn on top of each other
//   clipped  – text cut off by an overflow-hidden box without an ellipsis
//   offscreen– a control outside the viewport that can't be scrolled to
//   node scripts/ux-audit.mjs                 every screen in /screens
//   node scripts/ux-audit.mjs 3.3 4.4         just these
//   node scripts/ux-audit.mjs --stress        also rename every helper to a long name first
// Uses the installed Google Chrome. Needs the dev server on http://localhost:5173. Prints one line per finding and
// writes design/out/ux-audit.json.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const STRESS = process.argv.includes('--stress')
const SIZES = [[375, 812], [1024, 768], [1440, 900]]
const url = (id) => `http://localhost:5173${id === '1.1' ? '/' : `/s/${id}`}?speed=hold`

const browser = await chromium.launch({ channel: 'chrome' })
let ids = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (!ids.length) {
  const p = await browser.newPage()
  await p.goto('http://localhost:5173/screens', { waitUntil: 'networkidle' })
  ids = await p.$$eval('a.text-accent', (as) => as.map((a) => a.textContent.split(' · ')[0].trim()))
  await p.close()
}

const findings = []
for (const id of ids) {
  for (const [w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 })
    await page.goto(url(id), { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    if (STRESS)
      // Long helper names and a renamed workflow: the states where rows wrap and labels collide.
      await page.evaluate(() => {
        const pf = window.__pathfinder
        if (!pf) return
        const st = pf.store.get()
        const wf = st.workflows?.[st.activeId]
        if (!wf) return
        for (const id of wf.helperOrder) pf.dispatch({ type: 'helper/patch', id, patch: { name: `${wf.helpers[id].name} for the launch team` } })
      })
    await page.waitForTimeout(250)
    const found = await page.evaluate(() => {
      const out = []
      const vis = (el) => {
        const s = getComputedStyle(el)
        if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }
      const name = (el) => {
        const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
        return `${el.tagName.toLowerCase()} "${t}"`
      }
      // Inside a map canvas (pannable, scaled stage) things are free-placed and may sit off-view on purpose.
      const inMap = (el) => !!el.closest('.cursor-grab')
      const all = [...document.querySelectorAll('body *')].filter(vis)
      // The part of a box you can actually see: cut by every overflow-hidden/clip/scroll ancestor and the viewport.
      const visibleRect = (el, r) => {
        let L = r.left, T = r.top, R = r.right, B = r.bottom
        for (let e = el; e && e !== document.body; e = e.parentElement) {
          const s = getComputedStyle(e)
          if (s.overflowX === 'visible' && s.overflowY === 'visible') continue
          const c = e.getBoundingClientRect()
          if (s.overflowX !== 'visible') { L = Math.max(L, c.left); R = Math.min(R, c.right) }
          if (s.overflowY !== 'visible') { T = Math.max(T, c.top); B = Math.min(B, c.bottom) }
        }
        return { left: L, top: T, right: R, bottom: B, width: R - L, height: B - T }
      }

      // spill: content taller/wider than a visible-overflow box with an explicit size
      for (const el of all) {
        if (inMap(el) || el.tagName === 'svg' || el.closest('svg')) continue
        const s = getComputedStyle(el)
        if (s.overflowY !== 'visible' && s.overflowX !== 'visible') continue
        if (s.position === 'absolute' && el.children.length === 0) continue
        const kids = [...el.children].filter(vis).filter((k) => getComputedStyle(k).position !== 'absolute' && getComputedStyle(k).position !== 'fixed')
        if (!kids.length) continue
        const r = el.getBoundingClientRect()
        let bottom = -Infinity
        for (const k of kids) bottom = Math.max(bottom, k.getBoundingClientRect().bottom)
        if (bottom > r.bottom + 3 && s.overflowY === 'visible') out.push({ kind: 'spill', what: name(el), by: Math.round(bottom - r.bottom) })
      }

      // overlap: leaf text boxes / controls intersecting each other
      const leaves = all.filter((el) => {
        if (inMap(el)) return false
        const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        return text || el.matches('button, a, input, textarea, [role=button]')
      })
      const rects = leaves.map((el) => {
        // text: use the text's own line boxes, not the element box
        const range = document.createRange()
        range.selectNodeContents(el)
        const rr = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) ? range.getBoundingClientRect() : el.getBoundingClientRect()
        return { el, r: visibleRect(el, rr) }
      }).filter((x) => x.r.width > 2 && x.r.height > 2)
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j]
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue
          const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
          const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
          if (ix > 3 && iy > 3) {
            // one of them floats above on purpose (menus, popovers, toasts, sticky bars) → skip
            const layer = (el) => { for (let e = el; e; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky' || (p === 'absolute' && +getComputedStyle(e).zIndex > 0)) return e } return null }
            if (layer(a.el) !== layer(b.el)) continue
            out.push({ kind: 'overlap', what: `${name(a.el)} × ${name(b.el)}`, by: Math.round(Math.min(ix, iy)) })
          }
        }
      }

      // clipped: text cut by an overflow-hidden/clip ancestor, without an ellipsis
      for (const { el } of rects) {
        if (inMap(el)) continue
        const s = getComputedStyle(el)
        if (s.textOverflow === 'ellipsis') continue
        // a collapsed box (width ~0, e.g. a label hidden on phones by shrinking) is intentional
        if (el.clientWidth > 8 && el.scrollWidth > el.clientWidth + 1 && (s.overflowX === 'hidden' || s.overflowX === 'clip'))
          out.push({ kind: 'clipped', what: name(el), by: el.scrollWidth - el.clientWidth })
      }

      // offscreen controls the page can't scroll to
      const docW = document.documentElement.clientWidth
      for (const { el, r } of rects) {
        if (inMap(el) || !el.matches('button, a, input, textarea, [role=button]')) continue
        let scrolls = false
        for (let e = el.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowX + s.overflowY)) { scrolls = true; break } }
        if (!scrolls && (r.left >= docW || r.right <= 0)) out.push({ kind: 'offscreen', what: name(el), by: Math.round(r.left) })
      }
      return out
    })
    for (const f of found) findings.push({ id, w, ...f })
    await page.close()
  }
}
await browser.close()

const seen = new Set()
for (const f of findings) {
  const k = `${f.id}|${f.kind}|${f.what}`
  if (seen.has(k)) continue
  seen.add(k)
  const at = findings.filter((g) => g.id === f.id && g.kind === f.kind && g.what === f.what).map((g) => g.w)
  console.log(`${f.id.padEnd(12)} ${f.kind.padEnd(9)} @${at.join('/')}  ${f.what}  (${f.by}px)`)
}
fs.mkdirSync(path.join(root, 'design/out'), { recursive: true })
fs.writeFileSync(path.join(root, 'design/out/ux-audit.json'), JSON.stringify(findings, null, 1))
console.log(`\n${seen.size} findings on ${ids.length} screens`)
