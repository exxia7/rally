# Local MVP: UX review scope

The app uses the original routes and screens from `main`, including brief, chat, team, run, approval, and summary.
The original Figma screens remain at `/s/<frame>` for reference. Their scripted behavior is separate from the live backend.
The original shell, screens, maps, drawers, panels, colors, and controls remain in place. A state adapter connects them to the backend.

| Original audit concern | Live MVP behavior |
| --- | --- |
| 1a–1c: run dead ends | Start creates a real run. Claude results advance steps. Questions and approvals have visible actions. |
| 1e–1f: incomplete forks | Each fork has its own attempts and approvals. A fork can have a child fork. The user selects the export branch. |
| 2a–2d: ignored brief and edits | The planner receives the brief and files. The same validated plan supplies the map and execution. |
| 2e–2f: lost choices and approvals | SQLite retains answers and version-specific approvals. Export excludes declined outputs. |
| 2g–2h: lost forks and progress | SQLite retains branches. Live events restore current state after browser reconnect. |
| 3a–3c: incorrect progress | The dependency graph determines rerun scope. Attempt states determine counts. |
| 3d: false external delivery | The interface offers local artifact export. It does not claim to post externally. |
| 3e: fixed cost | The interface shows the cumulative successful SDK request estimate. Failed or cancelled request costs can be absent. |
| 4a: output edit dead end | The user edits an output inline. The edit invalidates prior approval. |
| 4d: previous version | The helper inspector exposes prior versions after an edit or rerun. |
| Mobile layout | The original mobile panels and scrollable map remain in place. The live browser test checks page overflow at 375px. |

## Deliberate limits

No auth, invitations, public links, external delivery, background queue, or automatic job recovery.
No remote tool connections, permission presets, binary uploads, image generation, or web research.
Unsupported prototype actions show a local-run message. They do not claim successful external work.
The original sample-screen audit remains a historical reference. This review does not claim to repair every sample screen.

## UI restoration

The replacement `src/live/` interface is removed. `src/main.tsx` loads the original `App` again.
The original Home, sidebar, filters, planning map, helper drawer, run map, hand-raise panel, approval panel, and summary remain.
Backend status uses a small message strip inside the original shell. Live labels describe local drafts and export accurately.
The existing model selector uses real Claude model aliases for backend workflows.

## Verification evidence

`npm run test:backend` checks graph validation, dependencies, pause, cancellation, questions, retries, branch isolation, approvals, and database restore.
`npm run test:live` checks real Claude execution through browser controls.
The live test saves `restored-plan.png`, `restored-summary.png`, `restored-fork.png`, and `restored-mobile.png` in `design/out/`.
