# Rally local MVP

The main app now uses a TypeScript backend, SQLite, and the Claude Agent SDK.
It runs locally without login. The original sample screens remain available at `/s/<frame>` in development.

## Start the demo

Use Node 22.13 or later and an existing Claude CLI login, or set `ANTHROPIC_API_KEY` in `.env`.
This workspace passed a live SDK check with its existing local Claude login.

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:5180**. The API listens on `127.0.0.1:3001`.
Port 5180 avoids another local project on port 5173.
Both processes must remain active during the demo.

Optional configuration: copy `.env.example` to `.env`. The default model is `haiku` for fast responses.
Set `CLAUDE_MODEL=sonnet` for a different model. The SDK controls model access.
Each request has a three-minute timeout and a $1 SDK budget limit.
The cost display shows an SDK estimate, not a bill.

## Demo flow

1. Create a workflow with a specific brief.
2. Reply to the planner if it requests essential information.
3. Select a helper to change its name, instructions, role, or dependencies.
4. Select **Start launch**.
5. Answer any helper question.
6. Review each artifact in the original approval panel.
7. Select **Download approved outputs** in the summary after review.
8. Select a completed helper and **Fork from here** to try another version.
9. Select **Use this version** before export from that branch.

Example brief:

> Create a launch email and a short social post for Acme Notes, a free notes app for university students. It launches tomorrow. Use two independent steps. Keep each output under 80 words. Do not invent features or links.

Files: TXT, Markdown, CSV, and JSON, up to five files of 100 KB each.
The planner and helpers receive their contents. Binary files and remote links are outside this MVP.

## Local state and execution

SQLite stores workflows, plans, files, attempts, prior versions, approvals, and activity in `.data/pathfinder.sqlite`.
Live events send the current state on connection and after every change.
A browser reload does not stop a run. An API restart interrupts active work and exposes a manual retry.
There is no background queue or automatic restart recovery.

Steps execute one at a time per branch, in dependency order. Up to three operations can be active across the workspace.
Pause prevents the next step. The active Claude request can finish.
Cancel stops the active request and retains completed outputs.
Rerun replaces the selected step and its descendants. Fork preserves the parent branch.
Each output edit requires fresh approval. Export excludes skipped outputs.

The default app produces text artifacts. It does not send email, post to social sites, browse the web, or generate images.
A design task can produce a text specification. The interface does not claim that external delivery occurred.
Plans become fixed after the first run. Duplicate a workflow to change its plan.

## Verification

```bash
npm run test:backend
npm run typecheck
npm run build
npx eslint src server shared
npm run test:live
```

The live test uses the original Figma screens. It requires both servers, Google Chrome, and Claude access. It makes real model calls.
It covers plan edits, pause/resume, questions, reload, approvals, export, forks, and a second browser at phone width.
It leaves a completed example workflow in SQLite and screenshots in `design/out/`.
Backend tests use a controlled agent to check errors and state transitions without model cost.

Implementation: `server/` contains the API, SDK adapter, database, and run engine.
`shared/domain.ts` defines schemas and graph validation.
The original screens in `src/screens/` use the backend through `src/state/backend.ts` and `src/state/backendViews.ts`.
The replacement interface was removed. The original app entry, layout, navigation, and components are restored from `main`.
See `design/local-mvp.md` for the scope of the UX review.

---

The following reference describes the original frontend prototype. Its scripts and storage behavior apply to sample screens, not the live MVP.

# Rally

Rally, built from the Figma wireframes
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
