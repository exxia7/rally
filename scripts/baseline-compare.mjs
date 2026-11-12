// Compares the latest pixel-diff screenshots (design/out/<id>.app.png) with a saved baseline
// (design/out/baseline-app/<id>.app.png, copied after a known-good `node scripts/pixel-diff.mjs`).
//   node scripts/baseline-compare.mjs [ids…]   → prints ids whose render changed, with the changed pixel count.
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dir = path.join(root, 'design/out')
const base = path.join(dir, 'baseline-app')
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(base).filter((f) => f.endsWith('.app.png')).map((f) => f.slice(0, -8)).sort()
let changed = 0
for (const id of ids) {
  const a = PNG.sync.read(fs.readFileSync(path.join(base, `${id}.app.png`)))
  const b = PNG.sync.read(fs.readFileSync(path.join(dir, `${id}.app.png`)))
  const n = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0 })
  if (n) { changed++; console.log(`${id.padEnd(12)} ${n} pixels changed`) }
}
console.log(changed ? `${changed} of ${ids.length} frames changed` : `all ${ids.length} frames identical to baseline`)
