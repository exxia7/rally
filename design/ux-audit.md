# Pathfinder UX audit

Read-only walk-through of the clickable prototype. Every finding has a stable id (1a, 2b, 4c, …) so other agents can reference it.

## User decisions for this pass

- The run auto-advances on a scripted timeline. Pause really pauses it.
- Small UI that isn't in Figma is allowed when it's built from the existing design system and listed.
- Forks end with per-fork approval plus a "Use this version" choice.
- This pass covers everything in the audit.

## Status since the audit

- 1d is partly addressed: "Add from Sandbox" has since been removed from the helper drawer, and Sandbox/Chat now have tabs or × on plan screens.

## How it was tested

Every element on all 40 frames was clicked at 1440×900 in a fresh load each time (the full click map is `design/clickmap-1440.txt`). The story was then walked end to end with Playwright: Home, brief, chat, team edits, launch, run, stuck, approve, summary, plus inspector rerun and all three fork entry points. 16 frames were spot-checked at 375×812.

Caveat: another agent was editing the plan screens during the audit (add-step-on-line work in `TeamMapScreen.tsx`, `PlanMap.tsx`, `planEdit.ts`). For a few minutes 2.3 failed to load because of a missing `edgeKey` export. It loaded again later and the 2.3 flows were re-run. Treat the plan-screen findings as true of the working copy at that time.

The core problem behind most of what follows: every frame owns its own mock data and local state, and buttons jump to fixed frames. So time goes backwards, edits vanish and your choices are ignored.

---

## 1. Dead ends (worst first)

### 1a. "Start launch" lands on a page that says nothing is running, and its only exit wipes the workflow

- **Where:** 2.3 / 2.4 / 2.5 / 2.6 / 2.7, the "Start launch" button (`PlanTopBar`).
- **What happens:** it opens 3.1, titled "New workflow", which says "No workflows running · Switch to the Planning tab". Both Planning links on 3.1 go to 2.1, the empty brief. The team, the edits and the chat are all lost.
- **Inconsistent:** the "Start launch" on 2.8 goes to 3.2 Running instead.
- **Same dead end via the toggle:** the Flowchart toggle on every planning screen (2.2–2.8) also goes to 3.1. So does Run → Planning → Flowchart: the running workflow becomes "New workflow · No workflows running".
- **Fix:** "Start launch" should go to 3.2, running with the current team. The Flowchart toggle should open the run if one exists. Show 3.1 only for a truly new workflow, and have its Planning link return to wherever you came from (2.2 or 2.3), not 2.1.

### 1b. The run never moves forward on its own

- **Where:** 3.2 and 3.3–3.5.
- **What happens:** nothing advances over time and nothing on the map leads to the stuck chapter or to approval. "Ready to post · Waits for your OK" only opens a generic inspector. If you arrive by "Start launch", you can never reach 4.1 or 5.1. The only routes are the Home card or the bell.
- **Fix:** simulate progress. After a few seconds the Strategist card's "Not sure" turns into a raised hand, the status pill becomes "Needs you" and a toast opens the 4.1 panel in place. "Ready to post" should open the approval panel once its inputs are done.

### 1c. After the rerun, the way onward is hidden

- **Where:** 4.2.
- **What happens:** the only way on is clicking the greyed Writer card ("Waits for new card"), which jumps to 4.3. Nothing hints at it, and the Tasks overlay row for the same step opens an inspector that says "Working · 4 pieces" instead.
- **Fix:** after the Strategist finishes, Writer raises its hand automatically: hand on the card, "Needs you" pill, panel opens.

### 1d. Sandbox ↔ Chat tab switching changes the team and loses your place (partly addressed)

This is the user's "upload from Sandbox" example. Partly addressed since the audit: "Add from Sandbox" has been removed from the drawer, and Sandbox/Chat now have tabs or × on plan screens. Re-check the rest.

- **2.3 → Sandbox:** goes to 2.6, a different frame where Community has been added and your rename and removal are gone.
- **2.6 → Chat:** goes to 2.5, a chat history you never typed ("I also want to post on our Discord forum").
- **2.7 → Chat:** goes to 2.3, which resets.
- **Helper drawer (at audit time):** "Add from Sandbox" (`HelperDrawer`) jumped to 2.6 and closed the drawer. There was no way back to the helper you were editing.
- **Fix:** Chat and Sandbox should be tabs of one panel on the same screen. Any "add from Sandbox" path should open the Sandbox tab with a "← Back to Writer" header, or a picker inside the drawer. Uploading or adding should return you to the tab or helper you came from.

### 1e. Fork-from-a-fork doesn't fork

- **Where:** 6.6, "Fork from here" inside Fork 2.
- **What happens:** it navigates to 6.6 again, so nothing happens.
- **Fix:** open the Fork card inline and create Fork 3.

### 1f. Forks have no ending

- **Where:** 4.5 / 6.5 / 6.6.
- **What happens:** a fork lane gets its own "Ready to post", but you can't approve it, pick it over the original, or compare the two. Clicking it only opens an inspector. There is also no branch switcher (the Branches row only shows on 6.4, while the fork is being set up).
- **Fix:** a Branches row that is always visible. "Ready to post" on a fork opens the approval panel scoped to that fork, with a "Use this version" choice.

### 1g. Several settings links drop you in the wrong context with no way back

- **2.7 → "Save as a new preset"** goes to 1.2 Workspace settings and leaves the workflow. 1.2 has no "Back to workflow".
- **1.2 → preset "Edit" / "New preset"** goes to 2.7, which is the AI Coach workflow's planning Sandbox. That's wrong for a workspace-level setting, and it carries a "Start launch" button.
- **2.8 → LinkedIn toggle** also leaves for 1.2 with no return.
- **2.8 → "Back to the map"** always goes to 2.3, even if you opened settings from a run (3.x) or from approval (5.1).
- **Fix:** do preset editing inside 1.2 (a modal or inline editor). Settings should return to the screen that opened them.

### 1h. Closing the summary or the hand-raise panel has a poor way back

- **5.2:** once the summary modal is closed, the only way to reopen it is clicking a map card. A "Show summary" button would help.
- **4.1:** after closing the hand-raise panel, the panel toggle opens Sandbox instead of the hand-raise. Make it reopen the hand-raise (or show a "Strategist needs you" chip).

---

## 2. Broken continuity

### 2a. Your brief is ignored

- **What I did:** on 2.1 I picked the "Pricing update" chip, then typed "Launch our new Teams plan…", and sent.
- **What happened:** 2.2 is always the AI Coach chat, titled "AI Coach launch". Attachments added on 2.1 don't carry over either.
- **Fix:** echo the brief as the first user message and in the Launch brief "What" field, and title the workflow from it. Show the AI Coach team as the plan for any brief, but keep the user's words.

### 2b. Plan edits don't reach anything else

This covers the user's "remove an agent" example. I renamed Writer to "Copywriter", switched it to Haiku, and removed Designer on 2.3.

- **Estimate never changes:** it stays "About 9 min · $0.30".
- **The suggestion chip still says Writer:** "Make the Writer more playful".
- **The run ignores the plan:** 3.2 (reached from 2.8) still shows Designer, "Writer", Visuals, and Designer in "agents done". So do the Tasks list, the decision log, the 4.1b list ("Designer · Visuals"), approvals and the summary.
- **Removal is not repaired:** removing Strategist leaves Planner, Scout and Insights unconnected to Writer and Designer. Removing Publisher leaves the "You approve" gate pointing at nothing and empty "Decide the message" and "Post" columns. "What goes out" still lists 4 outputs that nobody makes or posts.
- **No safety net:** there is no confirmation, no Undo, and no chat note on removal.
- **Fix:**
  - On removal, reconnect the removed helper's inputs to its outputs.
  - If nobody posts any more, ask whether to drop those outputs or hand them to another helper.
  - Recalculate the estimate.
  - Add a "Removed Designer · Undo" chat message.
  - Have the run, Tasks, Completed agents, decisions and approvals all read from the same team.

### 2c. Community

- 2.3's chat says "7 helpers" and has no Community, yet every run frame (3.x–6.x) has Community and a Discord post.
- Undoing Community on 2.5 doesn't remove it from the run or the approvals.
- Community added on 2.5 disappears when you click any other card (→ 2.4) or press Back.

### 2d. Clicking a card opens the wrong helper or step

- On 2.5, 2.6 and 2.7, clicking any helper card opens 2.4, which is the Strategist's drawer.
- In the run inspector, "Edit" and "Add" also open 2.4 Strategist, whatever node you're inspecting (Scout, Writer…). They also drop you into planning mode with a "Start launch" button, mid-run.
- In the run (3.x), "Fork from here" or "Rerun from here" on any node (Scout, Strategist…) opens 6.1, the Writer "Launch copy" inspector.
- **Fix:** open that helper or node.

### 2e. Hand-raise choices are thrown away

- **What I did:** on 4.1 I picked "Move the launch to Mar 14" and "Leave pricing out", then on 4.3 "Change the launch fact to $15/mo".
- **What happened:**
  - The 4.1b confirm dialog is unchanged.
  - 4.2 says "Adding: how we differ from Penny".
  - Approvals still say "Live Mar 12".
  - 5.2 "What you fixed" says "Kept Mar 12 and mentioned Penny" and "Changed the price from $15 to $12".
- **Fix:** carry the choices into the rerun scope, the launch facts, the approval copy and the summary.

### 2f. Approvals are forgotten

- **What I did:** on 5.1 I chose "Don't post" on the X post, then "Approve all 4".
- **What happened:** 5.2 says "X post · Posted" and "You approved every post as written today".
- Any Edit, Back, Tasks chip or "Decide later" from 5.1 resets all approvals.
- **Fix:** 5.2 lists what you declined as "Not posted · you skipped it". Approval state survives navigation.

### 2g. Fork and rerun input

- On 6.4 I typed "Lead with the free trial" (the "Shorter" chip fills its own text); 6.5 still creates "Vs Penny · Compare us to Penny up front".
- On 4.4 I picked "Students"; 4.5 still creates "First-timers".
- Forks disappear on Planning → Flowchart (→ 3.1) and are absent from Home, 5.1 and 5.2.
- The rerun note (6.2 → 6.3) does carry over; that is the pattern to copy.
- **Fix:** name the fork and its brief from the input.

### 2h. Run state resets

- Pause, "I'll do this one" and the open inspector all reset on any navigation.
- Home never changes: after launching, AI Coach still shows "Running · Needs your input", and the bell always opens 4.1.
- **Fix:** after 5.2 Done, the Home card should show Done · Launched Mar 12, and the bell should show nothing.

### 2i. Four separate copies of the permission setting, none shared

- The places: the drawer's "Checks with you", the 2.4e "Before Publisher runs" picker, the 2.7 presets, and the 2.8 presets. Choosing "Careful" in 2.7 leaves 2.8 on "Balanced".
- Choosing "Just go" for Publisher still shows "Your OK" on run cards and still asks for approval.
- "Allow" on 5.2's "Next time" isn't reflected anywhere.

---

## 3. Logic that doesn't make sense

### 3a. "Rerun 5 agents" reruns 3

- **Where:** 4.1b.
- **What happens:** the dialog lists Writer, Designer, Community and Publisher as rerunning, but 4.2 shows Designer and Publisher as "Reused". Only Strategist, Writer and Community redo.
- The 4.1 options say "3 helpers redo" (Keep Mar 12) or "7 helpers redo" (Mar 14), yet the dialog always says 5.
- **Fix:** derive the list and the count from the actual downstream steps of the chosen fix, and keep 4.2 consistent with it.

### 3b. Time jumps between frames

- **3.2 → Home card → 4.1:** 3.2 shows "4 of 10 done", the Strategist "Decided", Writer "Writing 3 of 5". 4.1 shows "3 of 10", the Strategist with its hand raised, and Writer waiting.
- **3.4 (running · $0.18) → Fork → 4.4:** 4.4 is "Needs you · $0.31", with everything done.
- **3.5 → Fork → 6.1:** Writer jumps from "Working · 4 pieces" to "Done · 5 pieces".
- **5.1 back to the run:** the Tasks chip ("9 of 10") goes to 3.2-tasks ("4 of 10 · Running"), and "Decide later" goes to 3.2 Running.
- **Fix:**
  - "Decide later" should go Home, with the card showing "5 to approve", or close the panel and leave the map in a waiting state.
  - The Tasks chip should open the overlay in place.
  - Order the run frames as one timeline, driven by shared run progress.

### 3c. Counts disagree

- 3.2 "5 agents done" includes Publisher, whose step hasn't run (Tasks says 4 of 10).
- On 6.5 the original Writer is "Done · 5 pieces" while its Discord step is still "Waits for Writer".
- Writer's pieces: the card says "3 of 5", the inspector "4 pieces", and 3.5 "See all 4 pieces" vs 6.1 "5 pieces".
- 5.1 says "6 waiting for your OK" with 5 items, because it counts the blocked $300 ad test.
- 3.2's Strategist card shows "Not sure" while its inspector says "Decided: existing budgeters" and offers no way to respond.

### 3d. Integrations contradict each other

- LinkedIn is "Not connected" in 1.2 and in 2.8, yet the plan's Publisher card lists "Email, X, LinkedIn", 5.1 asks you to approve a LinkedIn post and 5.2 says it was "Posted".
- Product Hunt isn't a connected tool anywhere, but it gets posted.
- Tool names differ: the run Sandbox has "X scheduler" and no Email (Resend), while planning has "X" and "Email (Resend)".
- **Fix:** either show LinkedIn as connected, or make 5.1 show "LinkedIn · Connect to post", leading to the connect flow.

### 3e. Money and time don't match

- The plan estimate is "About 9 min · $0.30"; 5.2 says "22 min · $0.34". That's plausible, but nothing explains the overrun, and the $2.00 cap in 2.8 says "Used $0.18" at every point.
- The Planner plans a "$300 budget", Permissions say ads are "Up to $50", and 5.1 says "Ads are blocked in Permissions". It's a limit, not a block, and the 5.1 card offers no link to change the rule.
- **Fix:** add a "Change rule" button that opens Permissions, and word it as "over your $50 ad limit".

### 3f. Done workflows open the AI Coach summary

- "Product Hunt relaunch" and "Hiring: founding designer" both open the AI Coach launch summary (5.2).
- The draft "Pricing change announcement" opens an empty "New workflow" brief.
- **Fix:** title and seed each frame from the card, or at minimum make the title and brief match the card.

### 3g. "Fork from here" asks twice

- On 3.5 it goes to 6.1, which shows "Fork from here" and "Rerun from here" again.
- **Fix:** open the Fork card inline (the 6.4 state) directly.

### 3h. Planning view mid-run still offers "Start launch"

- Run → Planning shows 2.3 as a fresh plan with "Start launch". Pressing it ends at 3.1.
- **Fix:** mid-run, Planning should say "Changes apply to steps that haven't started", and the main action should be "Back to run".

### 3i. "Duplicate" adds Community

- In any helper drawer, "Duplicate" goes to 2.5 with a Community helper.
- **Fix:** add a "Strategist copy" card next to the original, with its drawer open.

### 3j. "Connect a tool" opens Permissions

- In the drawer, "Connect a tool" goes to 2.7.
- **Fix:** open the connect step for that tool (or 1.2 Connected tools) and return to the drawer.

---

## 4. Misleading controls and clickable-looking things

- **4a. Approval items:** "Edit" on 5.1 opens the mid-run Writer inspector and loses approvals. It should edit the text inline.
- **4b. Map cards on 5.1:** every card opens the approval panel.
- **4c. Map cards on 5.2:** every card reopens the summary.
- **4d. Card-looking buttons that do nothing:**
  - 2.2: "Open" on the Launch brief, plus the "Your answers in this chat" and "Brand guide.pdf" cards.
  - 3.5: "See all 4 pieces". 4.1 and 4.3: "See the full handoff (4 items)". 6.3: "See previous version".
  - 1.2: "Manage" (×3).
  - 2.3: the "You approve" gate (it works on 2.4e).
  - 2.8: "Duplicate or save as template" and "Archive" in the side nav only highlight.
- **4e. 2.2 attach menu:** "Upload files", "Paste a link" and "Add a skill" just post that text as a chat message and get "Got it. I've added that to the launch brief." Use the 2.1 behaviour instead: a file picker, or an attachment chip.
- **4f. Run Sandbox (3.3):** rows show checkboxes and drag grips, but there is nothing to tick or drop onto. Clicking a row does nothing. The section "+" buttons only expand the section. Give rows an "Add to <step>…" menu, the way the plan Sandbox does on touch, and make "+" open import.
- **4g. Plan Sandbox (2.6 / 2.7), desktop:** clicking a row does nothing (it only drags). Show the same "Add to <helper>" menu on click.
- **4h. Decision log, 3.4:** "Change" only switches to the Chat tab. Prefill "Change: Launch Mar 12 at 9am → …". Typed changes get a generic reply and the decision isn't updated.
- **4i. Workflow ⌄ menu → "Permissions"** from a run goes to the planning 2.7 frame. "Workflow settings" from the run goes to 2.8, which has "Start launch" and "Back to the map → 2.3".

---

## 5. Mobile only (375)

- **5a. 2.6:** the Sandbox panel starts closed, so the frame's point isn't visible. Once opened it's a full-screen sheet over the map, so dragging is impossible; the tap "Add to <helper>" menu covers this. Map cards render at 66% and are unreadable.
- **5b. Hand-raise, inspector, approval and fork sheets (4.1, 4.3, 5.1, 4.4, 6.5):** they cover the whole map and the status pill. You can't see which card raised its hand or the "Needs you" state. Consider a half-height sheet or a header line naming the step.
- **5c. Workflow chevron:** a 14×14 tap target on every workflow screen. On 3.2 the title truncates to "AI …".
- **5d. 1.2 and 2.8:** the side nav scrolls horizontally with no visible hint that more tabs exist (offscreen: "Permission presets…", "Approvers / Duplicate / Archive"). The 1.2 "More" buttons are 16×16.
- **5e. 5.2:** the "Next time" Allow / Keep asking buttons sit below the scroll fold inside the modal.
- No horizontal page overflow on any frame checked.

---

## Proposed single source of truth

One `WorkflowStore` (React context plus reducer, persisted to sessionStorage so Back and reload keep state), keyed by workflow id and seeded from the current mock data. Screens become views of the store plus UI state (open panel, tab). Routes stay as entry points that set up the store state for each Figma frame.

| Entity | Fields | Writers | Readers |
|---|---|---|---|
| **workflows[]** | id, title, status (draft / running / needsYou / done), brief {what, when, who, goal, channels}, attachments, updatedAt | 2.1 (create + brief), 2.2 (goal and channels from chat), run progress, 5.2 Done | 1.1 cards, filters and counts; sidebar bell; breadcrumb and title on every screen |
| **helpers{}** | id, name, agent, kind, description, model, tokensK, tools, skills, files, checks (permission override), removed, isNew | 2.3–2.5 drawer, chat edits (2.4d, Discord), tool picker (2.4b), 2.4e picker, Sandbox drops (2.6) | Plan map, estimate, chat suggestions, run nodes and agents bar, Tasks, decisions, 4.1b and 6.2 affected lists, approvals, summary |
| **steps / edges / gates** | derived from helpers plus layout; removing a helper reconnects its inputs to its outputs; fork lanes are copies with forkId | Plan edits (add step, remove helper), fork create | Plan map, run map, Tasks overlay, rerun scope |
| **outputs ("What goes out")** | id, label, owner helper, channel, needsConnection | Chat edits, Add an output, removing a helper | Plan outputs card, 5.1 items, 5.2 "What went out" |
| **resources** | assets, skills, tools (with connected flag, the same one 1.2 shows), launch facts {date, price, audience, claim} | 2.6 import, 1.2 connections, 2.8 facts and toggles, hand-raise fixes (date, price) | Sandbox (plan and run), drawer, 2.8, 4.x problem cards, approval copy, summary |
| **permissions** | workspace presets + default (1.2); workflow preset / check level / ad limit (2.7 = 2.8); per-helper override (drawer, 2.4e); "next time" rules (5.2) | 1.2, 2.7, 2.8, drawer, 2.4e, 5.2 | Card badges ("Your OK"), run gating, 5.1 blocked items, Sandbox "Permissions" |
| **run** | phase (notStarted / running / paused / needsYou / rerunning / awaitingApproval / launched), per-step state + status text, cost, startedAt, a scripted timeline that advances phase | Start launch, Pause/Resume, timer, rerun confirm, hand-raise confirm | Status pill, map nodes, Tasks chip and overlay, Completed agents, Home card, bell |
| **handRaises[]** | stepId, problems, chosen option per problem, free text, resolved | 4.1 / 4.3 panels | Rerun scope (4.1b count and list), launch facts, approval copy, 5.2 "What you fixed" |
| **decisions[]** | who, step, title, basis, changedByYou | Helpers (seeded), Decision "Change", hand-raise fixes | Decisions tab, Yours/Helpers filters, export, fork-from-decision |
| **reruns[]** | stepId, note, affected steps (derived), previousVersion | 4.1b, 6.2 | 4.2 / 6.3 map ("Will rerun" / "Reused"), "See previous version", Tasks "Rerunning" |
| **approvals{}** | outputId → waiting / approved / declined / edited text | 5.1 (Approve / Don't post / Edit inline) | 5.1 counts, status pill, 5.2 "What went out", Home card |
| **forks[]** | id, colour index, parentBranch (original or forkId), fromStepId, name + brief from input, own run progress and approvals | 4.4 / 6.4 / 6.6 Fork card | Fork lanes and lines, Branches row, Tasks chip (fork-scoped), inspector branch label, approvals per fork, Home |
| **ui (per screen, not persisted)** | open panel/tab, drawer helper, return-to (for settings, Sandbox upload, drawer) | — | Back links: 2.8 "Back to…", drawer ← Sandbox, 1.2 "Back to workflow" |

### Navigation rules that follow from the model

- "Start launch" sets run.phase to running and goes to 3.2.
- The Planning ↔ Flowchart toggle reads run.phase.
- Every "Back" or "Done" uses the stored return-to target.
- Hand-raise and approval frames are reached by the run's phase changing, not by fixed links.
