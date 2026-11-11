# Pathfinder

Clickable prototype of Pathfinder, built pixel-exact from the Figma wireframes
(file `uL2LNYWjWvYM9rPXjwDwAr`, section `2362:50744` "emily's pass"). Vite + React 19 + TypeScript +
Tailwind v4. No backend: data is mock, state is local React state, every frame is a route.

Prefix node commands with `source ~/.nvm/nvm.sh &&` to get Node 22.

## Where things are

- `src/screens/registry.ts`: every Figma frame (`id` = frame number like `3.2`, `node` = Figma node id).
  Routes are `/s/<id>`; `/` is 1.1 Home; `/screens` lists them all.
- `src/screens/<chapter>/<Name>.tsx`: one module per frame (or per group of near-identical frames).
  It must `export const screenId = '3.2'` (or `['3.2', '3.2-tasks']`) and default-export the component.
  `App.tsx` picks it up automatically through `import.meta.glob`; never edit App.tsx to register a screen.
- `src/components/ui`: primitives (Button, Badge, ChoiceChip, Avatar, Icon, …).
- `src/components/shell`: AppShell (1440×900 frame, sidebar, main panel) and TopBar.
- `src/components/<area>`: shared composites (map, panels, planning, agents, …).
- `src/assets/icons`, `src/assets/art`: SVG/PNG downloaded from Figma. Never reference figma.com URLs at runtime.
- `design/ref/<id>.png`: Figma render of each frame (1440×900). `design/notes.md`: notes from the canvas.

## Pixel-exact rules

The bar is "looks exactly like Figma". Verify each screen with the diff harness, not by eye alone:

1. Dev server: `npm run dev` (port 5173, already running in most sessions; check with `curl -s localhost:5173`).
2. Reference: `get_screenshot` on the frame node with `maxDimension: 1440`, then
   `curl -sfL -o design/ref/<id>.png "<image_url>"`. It must be 1440×900.
3. `node scripts/pixel-diff.mjs <id>` prints the % of differing pixels and writes `design/out/<id>.diff.png`
   (red = differs) and `<id>.app.png`. Read the diff image and fix every structural mismatch: anything that
   is offset, the wrong size, colour, radius or missing. Text antialiasing noise (Figma vs Chrome) and
   sub-pixel text-width drift can't be removed; everything else can. Home (1.1) sits at 0.28%: aim for
   under ~0.6% on dense screens, and explain anything higher.
4. Measure, don't guess: `get_metadata` on a node gives exact x/y/width/height for its children. Compare with
   `getBoundingClientRect()` via Playwright when the diff shows a shift.

### Strokes: check whether they take layout space

Figma frames come in two kinds, and you must check which one with `get_metadata`:

- **Stroke included in layout** (the imported app shell, panels, top bar, secondary buttons): the first child
  sits at x/y = 1 inside a 1px-stroked frame. Use a normal CSS `border` (Tailwind is border-box).
- **Stroke inside, not in layout** (native Figma components such as the Workflow card): children start at
  0 and the frame's hug height ignores the stroke. Use the `edge` / `edge-t|b|l|r` utilities from
  `src/index.css`. They draw the stroke as an overlay and take no space. Colour `[--edge:#hex]`, width
  `[--edge-w:2px]`, dashed `[--edge-style:dashed]`.

Using the wrong one makes hug-sized boxes 2px too big or shifts content by 1px. It accumulates down a column.

### Translating get_design_context output

- Treat the returned code as a precise spec. Keep every size, padding, gap, radius, colour, font size, line
  height and letter spacing. Convert to clean Tailwind with `@theme` tokens (`text-ink`, `bg-accent-soft`,
  `border-line`, `rounded-card`, …) where the value matches exactly; otherwise keep the arbitrary value.
- Fonts: `font-['Inter:Medium']` → `font-medium`, `Inter:Semi_Bold` → `font-semibold`, `Inter:Bold` →
  `font-bold`, `Inter:Regular` → nothing. The Inter family is global.
- Drop `data-node-id`, `content-stretch`, `[word-break:break-word]`, `not-italic`, `relative shrink-0` noise
  where it changes nothing. Keep `whitespace-nowrap`, explicit widths, and `shrink-0` where layout needs it.
- `rounded-[33554400px]` → `rounded-full`.
- Replace absolute positioning with flex/grid when the design is auto-layout. Keep absolute positioning
  only for genuinely free-placed things: flowchart nodes and connectors on the map canvas, floating
  characters, overlays and popovers.
- Assets: download every asset URL with `curl -sfL` into `src/assets/icons/<name>.svg` or
  `src/assets/art/<name>.svg`, named after the Figma layer (`Icon / Pause` → `pause.svg`). If an icon appears
  in another colour, it is a separate file: `pause-white.svg`. Check the folder first and reuse a file
  that is byte-identical (`cmp`). Render with `<Icon src size>` or `<img>` at the exported size.
  Never redraw, crop or recolour an asset.

## Components: one owner per thing

Before writing markup, look in `src/components/**` for an existing component and reuse it, extending it
with a prop if needed. Shared components follow the Figma component names and descriptions (the Components
section `2362:28201`: Buttons & controls, Inputs, Agents, Navigation, Planning map, Run map, Panels & cards).
If a frame needs a variant that doesn't exist, add it to the shared component. Don't copy it into the screen.
Edits to a shared component must be backwards compatible, because other screens use it.

## Interactivity

It's a clickable prototype: things that look clickable do something. Prefer real local state (open/close
menus, switch tabs, toggle, type in the composer, drag a resource) inside a screen. When an action moves
to a different frame in the flow, `navigate(screenPath('<id>'))`. The flow order follows the chapters
(Home → Plan → Run → Stuck → Approve → Rerun/fork) and the frame numbers. Map overlays (`*-tasks`)
open from the Tasks chip, and the attach menus (`*-attach`) open from the composer's attach button.
