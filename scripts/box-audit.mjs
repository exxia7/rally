// Compare a built screen's element boxes with the Figma frame's layer boxes, at 1440×900.
//
//   node scripts/box-audit.mjs <id> [figma-node] [--tol=3] [--all] [--json]
//   node scripts/box-audit.mjs 3.2 2362:24736
//   node scripts/box-audit.mjs 2.2-attach --all          (also print boxes that match exactly)
//
// Figma side: design/meta/<id>.json, the frame's layer boxes (id, type, name, x, y, w, h, path), relative to
// the frame. If it's missing, the script builds it from Figma `get_metadata` XML, looked up by node id in:
//   1. design/meta/<id>.xml       a get_metadata dump of just that frame (save the tool's XML there), or
//   2. design/meta/section.xml    a get_metadata dump of the whole "emily's pass" section (2362:50744).
// The node id comes from the argument, or from src/screens/registry.ts. Delete the .json to rebuild it after
// the Figma frame changes (re-fetch get_metadata first).
//
// App side: loads http://localhost:5173/s/<id> (1.1 → /), then for every Figma layer finds its DOM element:
//   - an element tagged data-figma="<node id or layer name>" wins (tag ambiguous elements this way; it
//     changes no layout),
//   - a text layer matches the innermost element whose text starts with the layer name (Figma names text
//     layers after their first ~50 characters); only x, y and height count, since text width drifts between
//     Figma and Chrome,
//   - any other layer matches the element whose box is closest, if every edge is within --tol px (default 3).
// It prints every layer off by ≥0.5px (dx dy dw dh = app − Figma) and every layer with no element within
// tolerance ("unmatched": either a real offset bigger than tol, or an element that needs a data-figma tag, or
// a layer the build legitimately draws differently, e.g. an SVG icon's inner vector). Exit code is 0; read
// the list.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const metaDir = path.join(root, 'design/meta')
const args = process.argv.slice(2)
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.slice(2).split('=')
    return [k, v ?? true]
  })
)
const [id, nodeArg] = args.filter((a) => !a.startsWith('--'))
if (!id) {
  console.error('usage: node scripts/box-audit.mjs <id> [figma-node] [--tol=3] [--all] [--json]')
  process.exit(1)
}
const tol = Number(flags.tol ?? 3)

// ---------- Figma boxes ----------
function registryNode(frameId) {
  const src = fs.readFileSync(path.join(root, 'src/screens/registry.ts'), 'utf8')
  const re = new RegExp(`id:\\s*'${frameId.replace(/[.]/g, '\\.')}',\\s*node:\\s*'([^']+)'`)
  return src.match(re)?.[1]
}

const decode = (s) =>
  s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

// Parse get_metadata XML and return the boxes under `node`, relative to it (nested x/y are parent-relative).
function boxesFromXml(xml, node) {
  const tag = /<(\/)?([a-z][\w-]*)((?:\s+[\w-]+="[^"]*")*)\s*(\/)?>/g
  const attr = (s, k) => s.match(new RegExp(`\\s${k}="([^"]*)"`))?.[1]
  const stack = []
  const out = []
  let inside = false
  let depthAtRoot = -1
  for (const m of xml.matchAll(tag)) {
    const [, closing, type, attrs, selfClosing] = m
    if (closing) {
      const top = stack.pop()
      if (inside && stack.length === depthAtRoot) return out
      void top
      continue
    }
    const parent = stack[stack.length - 1]
    const x = Number(attr(attrs, 'x') ?? 0) + (parent?.ax ?? 0)
    const y = Number(attr(attrs, 'y') ?? 0) + (parent?.ay ?? 0)
    const entry = {
      id: attr(attrs, 'id'),
      name: decode(attr(attrs, 'name') ?? ''),
      type,
      hidden: attr(attrs, 'hidden') === 'true' || parent?.hidden,
      ax: x,
      ay: y,
      w: Number(attr(attrs, 'width') ?? 0),
      h: Number(attr(attrs, 'height') ?? 0),
      path: parent ? [...parent.path, parent.name] : [],
    }
    if (!inside && entry.id === node) {
      inside = true
      depthAtRoot = stack.length
      entry.ax = 0
      entry.ay = 0
      entry.path = []
    } else if (inside && !entry.hidden) {
      out.push({ id: entry.id, type, name: entry.name, x: entry.ax, y: entry.ay, w: entry.w, h: entry.h, path: entry.path.slice(1).join(' › ') })
    }
    if (!selfClosing) stack.push(entry)
    else if (inside && stack.length === depthAtRoot) return out
  }
  if (!inside) throw new Error(`node ${node} not found in the metadata XML`)
  return out
}

function loadBoxes() {
  const jsonPath = path.join(metaDir, `${id}.json`)
  if (fs.existsSync(jsonPath)) {
    const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    if (nodeArg && meta.node !== nodeArg) throw new Error(`${jsonPath} is for ${meta.node}, not ${nodeArg}; delete it to rebuild`)
    return meta
  }
  const node = nodeArg ?? registryNode(id)
  if (!node) throw new Error(`no Figma node for ${id}: pass it as the second argument`)
  const own = path.join(metaDir, `${id}.xml`)
  const section = path.join(metaDir, 'section.xml')
  const xmlPath = fs.existsSync(own) ? own : section
  if (!fs.existsSync(xmlPath)) throw new Error(`save get_metadata XML for ${node} to ${own}`)
  const boxes = boxesFromXml(fs.readFileSync(xmlPath, 'utf8'), node)
  const meta = { id, node, source: path.relative(root, xmlPath), boxes }
  fs.mkdirSync(metaDir, { recursive: true })
  fs.writeFileSync(jsonPath, JSON.stringify(meta, null, 1))
  return meta
}

const meta = loadBoxes()

// ---------- DOM boxes ----------
const browser = await chromium.launch()
// Reduced motion: every animation is off, so a frame renders exactly its Figma state.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
await page.goto(`http://localhost:5173${id === '1.1' ? '/' : `/s/${id}`}`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(150)

const results = await page.evaluate(
  ({ boxes, tol }) => {
    const norm = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
    const els = [...document.body.querySelectorAll('*')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden')
    const describe = (el) => {
      const cls = typeof el.className === 'string' ? el.className.split(/\s+/).slice(0, 4).join('.') : ''
      const text = norm(el.textContent ?? '').slice(0, 24)
      return `<${el.tagName.toLowerCase()}${cls ? ' .' + cls : ''}>${text ? ' "' + text + '"' : ''}`
    }
    const delta = (b, r) => ({ dx: r.x - b.x, dy: r.y - b.y, dw: r.width - b.w, dh: r.height - b.h })
    const round = (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Math.round(v * 100) / 100]))
    return boxes.map((b) => {
      // 1. explicit tag
      const tagged = els.find(({ el }) => {
        const t = el.getAttribute('data-figma')
        return t && (t === b.id || t === b.name)
      })
      if (tagged) return { ...b, how: 'tag', el: describe(tagged.el), d: round(delta(b, tagged.r)) }
      // 2. text layers: innermost element whose text starts with the layer name
      if (b.type === 'text') {
        const want = norm(b.name)
        if (want) {
          const cands = els.filter(({ el }) => {
            const t = norm(el.textContent ?? '')
            return t.length && (t.startsWith(want) || want.startsWith(t) && t.length >= Math.min(want.length, 12))
          })
          // innermost = no candidate descendant
          const inner = cands.filter((c) => !cands.some((o) => o !== c && c.el.contains(o.el)))
          let best = null
          for (const c of inner) {
            // The element box (line-height based) usually equals Figma's text box; when the text sits centred
            // in a bigger element (a tile, a pill), the glyph run's own rect is the better match.
            const range = document.createRange()
            range.selectNodeContents(c.el)
            const cs = getComputedStyle(c.el)
            const px = (k) => parseFloat(cs[k]) || 0
            const content = new DOMRect(
              c.r.x + px('paddingLeft') + px('borderLeftWidth'),
              c.r.y + px('paddingTop') + px('borderTopWidth'),
              c.r.width - px('paddingLeft') - px('paddingRight') - px('borderLeftWidth') - px('borderRightWidth'),
              c.r.height - px('paddingTop') - px('paddingBottom') - px('borderTopWidth') - px('borderBottomWidth')
            )
            for (const r of [c.r, content, range.getBoundingClientRect()]) {
              const d = delta(b, r)
              const cost = Math.abs(d.dx) + Math.abs(d.dy) + Math.abs(d.dh)
              if (!best || cost < best.cost) best = { c, d, cost }
            }
          }
          if (best && Math.abs(best.d.dx) <= 40 && Math.abs(best.d.dy) <= 40)
            return { ...b, how: 'text', el: describe(best.c.el), d: round(best.d) }
        }
      }
      // 3. closest box within tolerance
      let best = null
      for (const c of els) {
        const d = delta(b, c.r)
        const m = Math.max(Math.abs(d.dx), Math.abs(d.dy), Math.abs(d.dw), Math.abs(d.dh))
        if (m > tol) continue
        const cost = Math.abs(d.dx) + Math.abs(d.dy) + Math.abs(d.dw) + Math.abs(d.dh)
        if (!best || cost < best.cost) best = { c, d, cost }
      }
      if (best) return { ...b, how: 'box', el: describe(best.c.el), d: round(best.d) }
      return { ...b, how: 'none' }
    })
  },
  { boxes: meta.boxes, tol }
)
await browser.close()

const off = (r) => {
  if (r.how === 'none') return false
  const { dx, dy, dw, dh } = r.d
  const keys = r.how === 'text' ? [dx, dy, dh] : [dx, dy, dw, dh]
  return keys.some((v) => Math.abs(v) >= 0.5)
}
const fmt = (v) => (v === 0 ? '0' : (v > 0 ? '+' : '') + v)
const offs = results.filter(off)
const none = results.filter((r) => r.how === 'none')
const ok = results.length - offs.length - none.length

if (flags.json) {
  console.log(JSON.stringify({ id, node: meta.node, ok, off: offs, unmatched: none }, null, 1))
} else {
  console.log(`${id} (${meta.node}): ${results.length} layers · ${ok} exact · ${offs.length} off by ≥0.5px · ${none.length} unmatched (tol ${tol}px)`)
  const line = (r) =>
    `  ${r.name.slice(0, 34).padEnd(34)} ${r.id.padEnd(12)} fig ${r.x},${r.y} ${r.w}×${r.h}`
  if (offs.length) console.log('\nOFF (app − Figma):')
  for (const r of offs)
    console.log(`${line(r)}  d ${fmt(r.d.dx)},${fmt(r.d.dy)} ${fmt(r.d.dw)}×${fmt(r.d.dh)}${r.how === 'text' ? ' (text: width ignored)' : ''}  ${r.el}\n      in ${r.path}`)
  if (none.length) console.log('\nUNMATCHED (no element within tolerance; tag with data-figma or raise --tol):')
  for (const r of none) console.log(`${line(r)}\n      in ${r.path}`)
  if (flags.all) {
    console.log('\nEXACT:')
    for (const r of results.filter((r) => r.how !== 'none' && !off(r))) console.log(`${line(r)}  ${r.how} ${r.el}`)
  }
}
