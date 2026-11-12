# Pathfinder

Clickable prototype of Pathfinder, built pixel-exact from the Figma wireframes
(file `uL2LNYWjWvYM9rPXjwDwAr`, section `2362:50744` "emily's pass"). Vite + React 19 + TypeScript +
Tailwind v4. No backend: data is mock, state lives in one store (`src/state`, see "App state"), every frame is a
route.

Prefix node commands with `source ~/.nvm/nvm.sh &&` to get Node 22.

## Where things are

- `src/screens/registry.ts`: every Figma frame (`id` = frame number like `3.2`, `node` = Figma node id).
  Routes are `/s/<id>`; `/` is 1.1 Home; `/screens` lists them all.
- `src/screens/<chapter>/<Name>.tsx`: one module per frame (or per group of near-identical frames).
  It must `export const screenId = '3.2'` (or `['3.2', '3.2-tasks']`) and default-export the component.
  `App.tsx` picks it up automatically through `import.meta.glob`; never edit App.tsx to register a screen.
- `src/components/ui`: primitives (Button, Badge, ChoiceChip, Avatar, Icon, …).
- `src/components/shell`: AppShell (1440×900 frame: sidebar + main panel), TopBar, and Sidebar (Figma-file-browser
  style: workspace menu → 1.2, search, Home, Needs you, the Workflows list, New workflow, account menu with Reset demo
  and All screens; its collapse/drawer state is in `sidebarUi.ts`). The wireframes' 52px rail is the collapsed state.
- `src/components/<area>`: shared composites (map, panels, planning, agents, …).
- `src/assets/icons`, `src/assets/art`: SVG/PNG downloaded from Figma. Never reference figma.com URLs at runtime.
- `design/ref/<id>.png`: Figma render of each frame (1440×900). `design/notes.md`: notes from the canvas.

## The bar: Figma's sizing and spacing, built like a real app

Updated by the user after the first build. **Figma's sizing and spacing are the spec**: paddings, gaps, margins,
control heights, card and panel widths, radii, type sizes and colours come from the design and its tokens. **Pixel
exactness is not the goal**: don't chase antialiasing or sub-pixel text widths, and don't add hacks to match a
render (fractional pinned widths like `w-[148.031px]`, text-box rounding tricks, hand-tuned 0.25px offsets).
Where an earlier hack hurts real behaviour, replace it with the system value.

Build it the way a developer would ship it:
- Anything that can outgrow its box scrolls in its own container (`min-h-0` + `overflow-y-auto` on the flex child),
  with headers, tab rows, composers and footers staying put (sticky or outside the scroll area) and the last item
  clearing them. A scroll area that cuts content shows it's scrollable (a fade or a shadow at the edge), never a
  hard slice with a dead band under it.
- No fixed heights that clip content; heights hug content unless the design is a fixed-size control.
- Long names, long copy, many items and empty states all lay out cleanly; text wraps or truncates on purpose.
- Menus, popovers and modals stay inside the viewport and scroll inside themselves when tall.

The pixel tools below are still useful as a **visual check** (use the diff images to spot spacing or sizing that
drifted from Figma), but a few percent of difference is fine and a frame doesn't have to stay identical to the
baseline.

## Pixel tools (visual check only)

Verify each screen with the diff harness, not by eye alone:

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
to a different frame in the flow, `useGo()` → `go('<id>')` (never `navigate` directly: see "App state"). The flow order follows the chapters
(Home → Plan → Run → Stuck → Approve → Rerun/fork) and the frame numbers. Map overlays (`*-tasks`)
open from the Tasks chip, and the attach menus (`*-attach`) open from the composer's attach button.

## App state

Every screen is a view of one store plus its own UI state (open panel, tab, drawer, hover). Never keep workflow
data (helpers, outputs, run progress, approvals, choices) in a screen's `useState`, and never jump to a fixed frame
to "show" a state: change the store and let the screen render it.

- `src/state/types.ts`: the entities (`AppState` → `workspace`, `workflows[id]`, `order`, `activeId`, `returnTo`,
  `speed`). A `Workflow` holds the brief, chats, `helpers`/`helperOrder`/`removed`, `planSteps` (steps added on a
  line), `outputs`, `resources` (assets, skills, tools, launch `facts`), `permissions`, `run` (phase, beat, paused,
  per-step overrides), `handRaises`, `decisions` (yours), `reruns`, `approvals`, `forks` + `chosenVersion`.
- `src/state/store.ts`: `useAppState()`, `useWorkflow()` (the active workflow), `dispatch(action)`. Every change is
  an `Action` handled in `reduce`; add a new action there rather than mutating state anywhere else. The store is
  persisted to sessionStorage (reload and Back keep it). Additive fields are fine; give them a default in
  `scenes.ts` so every scene sets them.
- `src/state/scenes.ts`: `sceneFor(id)` builds the whole store state for Figma frame `id` from the screens' data
  files (`aiCoachPlan`, `communityPlan`, `aiCoachMap`, `stuck/data`, `launchMap`…). Data lives in those files;
  scenes and selectors import it, never copy it.
- Selectors (pure functions of a workflow): `planView.ts` (`planLayout(wf, 'full'|'compact'|'wide')`, `estimate`,
  `planSuggestions`, `bridgeEdges`), `runView.ts` (`runData(wf)` for RunScreenLayout, `runStatus`, `runCost`,
  `handRaiseData`, `rerunConfirm`, `approvalItems`, `summaryView`, `workflowCard`, `agentNames`, `goneSteps`).
  Derive counts and lists here; never hard-code "4 of 10" or "5 agents" in a screen.
- `asDrawn`: a scene marks its workflow with the frame id. While it's set, selectors return Figma's literal text
  where Figma disagrees with its own data (counts, the estimate, 4.1b's list). The first action that changes the
  workflow clears it. This is what keeps direct loads pixel-exact while live flows stay consistent.

### Seeded vs carried navigation

- A direct load (typed URL, `/`, a link from `/screens`) has no carried history state, so `Seeded` in `App.tsx` seeds
  the store from that frame's scene, then marks the entry carried. The pixel diff therefore always sees the scene.
- In-app moves use `useGo()` from `src/state/nav.ts`: `go('3.2')` navigates with `{ carried: true }`, so the next
  screen renders the live store. `go(id, { returnHere: true })` pushes the current screen on the return-to stack and
  `go.back('2.3')` pops back to it (fallback if empty). `go(id, { state })` adds history state (6.3's note). Links
  use `state={CARRY}`. Never call `navigate(screenPath(…))` directly.
- `/screens` has "Reset demo" (clears the session and reseeds Home).

### The run timeline

`src/state/timeline.ts`: `BEATS` is the scripted story (launch → deciding → running 3.2 → handRaise1 4.1 → rerun
4.2 → handRaise2 4.3 → finishing → approval 5.1 → launched 5.2). `installTimeline` advances the active workflow's
beat with a timer (`run/advance`) while it's running and not paused or held; beats that wait for you advance when you
answer (`handRaise/confirm`, `approval/launch`). Beats whose helper was removed are skipped. Speed: `?speed=fast`
(10×), `?speed=hold` (frozen) or `?speed=normal`, remembered in the store. Run screens call
`useRunFrameSync(id)` so they replace themselves with the beat's frame when it moves on (the hand-raise panel opens
in place). Scenes for frames not on the timeline yet (forks, rerun from a step) set `run.hold`.

Run screens use `useLiveRun(id)` (`src/state/useRun.ts`): it returns the props for RunScreenLayout (data, status,
controlled Pause, renamed agents, Planning target) and does the frame sync. Shared actions with navigation live in
`src/state/actions.ts` (`useStartLaunch()`: `run/start` then go to the run). `window.__pathfinder` (dev only) exposes
`{ store, dispatch }` for scripts.

Checks for this layer: `node scripts/story-e2e.mjs` walks the main story with a removed and a renamed helper;
`node scripts/baseline-compare.mjs` compares the latest pixel-diff screenshots with `design/out/baseline-app/` pixel
for pixel (refresh that folder from a known-good run). Small UI that isn't in Figma goes in `design/non-figma-ui.md`.

### How a screen reads and writes

```tsx
const wf = useWorkflow();
const go = useGo();
const data = useMemo(() => runData(wf), [wf]);      // derive, don't copy
dispatch({ type: 'helper/remove', id: 'designer' }); // write through an action
go('3.2');                                           // move with carried state
```

## Responsive: every screen size

Figma only has 1440×900 desktop frames. The app must work from a 375px phone to a wide desktop **and** stay
pixel-exact at 1440×900, so:

- Write Figma's desktop styles unprefixed, then adapt with `max-xl:` (under 1280px: tablet and small laptop)
  and `max-md:` (under 768px: phone). Never restructure the desktop styles to suit small screens; the
  1440×900 pixel diff must not change.
- Screen containers never use fixed 1440/900/884 sizes. AppShell fills the viewport (`h-dvh w-full`), and
  content uses `flex-1`, `min-w-0`, `min-h-0`, `max-w-[…]`, `w-full`. Fixed sizes on cards, map nodes and
  controls are fine.
- AppShell: the sidebar is docked at 240px from 1280px (collapsible to a 52px rail, remembered in localStorage), a
  52px rail at 768–1279px (expanding opens it over the content), and under 768px a slide-out drawer opened from the
  menu button TopBar adds on phones; the main panel is full-bleed there. No bottom bar, so nothing offsets for one.
- Side panel (Chat/Sandbox/Decisions), drawers, inspector: docked beside the content at ≥1280px; under 1280px
  they overlay the content from the right with a scrim and ×; under 768px they're full-screen sheets.
- Map canvas: a pannable viewport (overflow-auto plus drag-to-pan) holding the map at design size. Zoom
  controls really scale it; under 768px it starts fit-to-width. Canvas overlays (Tasks chip, agents bar,
  zoom) stay pinned to the viewport corners.
- Top bars: under 768px, breadcrumb collapses to the truncated workflow name, and secondary icon buttons go
  into a "more" menu. Settings side-nav becomes a horizontal scrolling tab row. Modals and menus:
  `max-w-[calc(100vw-32px)]`. Card grids switch to `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`
  under 1280px (see Home).
- Check: `node scripts/responsive-check.mjs <id>` renders 375/768/1024/1280/1920, saves
  `design/out/<id>@<w>.png` and flags horizontal overflow. Every screen must pass with no overflow, and the
  375 and 768 renders must look deliberate: nothing clipped, overlapping or unreachable.

## Motion

All animation is **framer-motion** (pinned in package.json); there are no CSS keyframes. Figma has no motion spec, so
every animation is listed in `design/non-figma-ui.md` ("Motion" rows). Keep it calm and product-grade.

- **Where:** `src/lib/motion.ts` has the timings, variants and hooks; `src/components/motion/Motion.tsx` has the
  ready-made pieces. `<MotionRoot>` wraps the app in `main.tsx` (`<MotionConfig reducedMotion="user">`). Import from
  these; don't hand-roll durations or easings.
- **Timings** (`transitions`): `fast` 150ms (menus, popovers), `base` 240ms (panels, modals, fades, ticks), `slow`
  450ms (cross-fades, rises), `draw` 600ms (a line drawing in), all ease-out `EASE_OUT` = cubic-bezier(0.22, 1, 0.36,
  1); `glide` (critically damped spring, ~400ms) for moves; `pop` (spring, small overshoot) for pop-ins. Loops are
  slow (1.4–2.8s) and subtle and start from the drawn look.
- **Variants** (`variants.<name>`, each `hidden` → `shown`): `fadeIn`, `rise`, `pop`, `scaleIn`, `slideInRight`,
  `slideInLeft`, `sheetUp`, `drawIn`. Use `initial="hidden" animate="shown" exit="hidden"`.
- **Pieces** (Motion.tsx), each still on a first paint and instant under reduced motion:
  - `<FadePresence show variant?>`: AnimatePresence + fade (or any variant) in and out.
  - `<Pop show? origin?>`: popovers, menus, dialog boxes; scales from 97% and fades (150ms). Without `show`, only
    its entrance plays (for a parent that mounts it conditionally).
  - `<SlidePanel open side="right"|"left">`: drawers and panels, 24px slide + fade, and back out.
  - `<Sheet open>`: a bottom sheet that rises from below the screen.
  - `<Expand open>`: expand/collapse to `height: auto` with a fade (220ms): dropdown bodies, accordions, the Tasks
    list.
  - `<Rise play?>`: rise 6px + fade on mount (new chat message, new card).
  - `<TickText text play?>`: text that ticks up when it changes ("3 of 9 done" → "4 of 9 done").
  - `<ThinkingDots char? dotClassName? still?>`: three dots pulsing in turn (working badge, chat typing row).
  - Already wired: SidePanel (slides in when the panel slot opens while you watch, via AppShell's `PanelEnter`;
    sheets rise on phones; scrim fades), Modal (scrim fade + `scaleIn` box, both ways), Menu (`scaleIn` entrance),
    the Tasks dropdown (`Expand`), chat `Message enter` and `TypingRow`.
- **Reduced motion:** nothing moves. `MotionConfig reducedMotion="user"` stops transforms and layout animations;
  our pieces also make opacity instant and drop loops (`useMotionOn()`, `useTransition(t)`). Anything you write
  directly with `motion.*` must do the same: `initial={on && play ? 'hidden' : false}` and loops only when `on`.
- **First paint:** a direct load paints its frame still. Overlays animate only when they mount after the app's first
  paint (`useEnter()`; AnimatePresence `initial={appear}`). The run and plan maps remember what the viewer saw,
  outside React, so a change animates even across the route swaps between beats: `useChangedFrom(key, value)` (state
  changes), `useAdded(scope, ids)` (what appeared), keyed by workflow (`map:<activeId>`).
- **Performance:** animate `transform`, `opacity` and SVG `pathLength` / `pathOffset` (plus `d`, `cx`, `cy` on
  re-routed connectors, the 40px Tasks bar's width and `height: auto` in `Expand`). Map cards keep their left/top
  and glide with `useGlide(x, y)` (FLIP on `x`/`y` motion values); don't use the `layout` prop on the zoomed,
  pannable maps. No `will-change` unless a profile asks for it.
- **Checks:** the pixel scripts render with `reducedMotion: 'reduce'`, so they see the still frame.
