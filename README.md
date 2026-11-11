# Pathfinder

A clickable prototype of Pathfinder, built from the Figma wireframes
([file](https://www.figma.com/design/uL2LNYWjWvYM9rPXjwDwAr/Wireframes?node-id=2362-50744), section
"emily's pass"). Every Figma frame is a screen you can open and click through. There's no backend:
data is mock and state is local.

## Run it

You need Node 22 (`.nvmrc`).

```bash
npm install
npm run dev
```

Then open:

- http://localhost:5173: Home, the start of the flow
- http://localhost:5173/screens: every screen, grouped by chapter (Home → Plan → Run → Stuck → Approve →
  Rerun & fork). Each one is also at `/s/<frame number>`, e.g. `/s/3.2`.

It works from phone width up to large desktop; at 1440×900 it matches the Figma frames.

## Checks

| Command | What it does |
|---|---|
| `npm run diff -- 3.2` | Pixel-diffs a screen against its Figma render in `design/ref/` (needs `npm run dev` running) |
| `npm run responsive -- 3.2` | Renders a screen at 375–1920px and flags horizontal overflow |
| `node scripts/box-audit.mjs 3.2` | Compares element positions and sizes with Figma's layout data |
| `node scripts/dead-click-audit.mjs` | Clicks everything on every screen and lists controls that do nothing |
| `npx tsc -b && npx eslint src` | Typecheck and lint |

`CLAUDE.md` has the build conventions.
