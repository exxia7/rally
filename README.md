# Pathfinder

Pathfinder, built from the Figma wireframes
([file](https://www.figma.com/design/uL2LNYWjWvYM9rPXjwDwAr/Wireframes?node-id=2362-50744), section
"emily's pass"). It runs as a working app with no backend: your workflows, edits and runs are saved in the
browser (localStorage) and stay across reloads. A first visit starts from a starter workspace.

## Run it

You need Node 22 (`.nvmrc`).

```bash
npm install
npm run dev
```

Then open http://localhost:5173. URLs:

- `/`: Home · `/settings`: workspace settings
- `/w/<workflow id>`: reopens a workflow where you left it; `/w/<workflow id>/<page>` for a page (`brief`, `chat`,
  `team`, `run`, `decisions`, `approve`, `summary`…; the full table is `PAGE_OF` in `src/screens/registry.ts`).
- Dev only: `/screens` lists every Figma frame and `/s/<frame number>` (e.g. `/s/3.2`) opens it with its sample
  state. Sample states aren't saved, so they never overwrite your data; reload to get it back.

To start over, clear the site's storage in the browser.

It works from phone width up to large desktop; at 1440×900 it matches the Figma frames.

## Checks

| Command | What it does |
|---|---|
| `npm run diff -- 3.2` | Pixel-diffs a screen against its Figma render in `design/ref/` (needs `npm run dev` running) |
| `npm run responsive -- 3.2` | Renders a screen at 375–1920px and flags horizontal overflow |
| `node scripts/box-audit.mjs 3.2` | Compares element positions and sizes with Figma's layout data |
| `node scripts/dead-click-audit.mjs` | Clicks everything on every screen and lists controls that do nothing |
| `npx tsc -b && npx eslint src` | Typecheck and lint |
| `node scripts/story-e2e.mjs` | Walks the main story on the live store (needs `npm run dev`) |
| `node scripts/baseline-compare.mjs` | Pixel-for-pixel compare of the last pixel-diff renders with `design/out/baseline-app/` |

`CLAUDE.md` has the build conventions.
