# UI that isn't in Figma

Small additions a flow needs, built only from existing components and tokens. Add a row whenever you add one.

| Screen | What | Why |
|---|---|---|
| /screens | "Reset demo" button (Secondary Small) next to the title | Clears the session (edits, run progress) and starts again from Home's scene. |
| 2.3 (chat) | "Removed Designer. Strategist now passes straight to Publisher. …" assistant note with Undo | 2b: a removal needs a safety net and says how the lines reconnected (store action `helper/remove` writes it; 2.3's UI shows it once the plan agent converts TeamMapScreen). |
| 3.2 (run, before Figma's 3.2 state) | "launch" and "deciding" beats: research helpers working ("Making the plan", "Comparing apps", "Reading the survey"), then "Deciding who it's for" | 1b: the run needs to move from Start launch to the frame Figma draws. Built from the 3.2 map data. |
| 3.2 (after 4.3) | "finishing" beat: Community "Drafting the post", Publisher "Scheduling", Ready to post "Waits for your OK" | 1b/1c: Writer's fix has to lead somewhere before the approval opens. |
| 4.2 | Upstream steps in a bigger rerun show "Redoing" (Mar 14 choice); Strategist note "Moving the launch to Mar 14" | 2e/3a: the rerun shows the scope you chose. |
| 4.1, 4.3 | "Resume" (as Figma draws it) reopens the hand-raise panel instead of resuming | The run waits for your answer while a hand is raised. |
| 5.1 | Tasks chip opens the Tasks overlay in place (was a jump to 3.2-tasks) | 3b. |
| 5.1 | "Decide later" goes Home, where the card reads "N to approve" | 3b. |
| 5.2 | Declined items: "–" and muted, "Not posted · you skipped it"; "You skipped N post(s) today." | 2f. |
| 5.2 | Without Community, "Next time" asks "Let Publisher schedule posts without asking?" | 2b: the question can't name a helper you removed. |
| 5.2, Decisions tab | Your hand-raise answers as "You" entries in the Decisions tab | 2e: your choices are decisions. |
| Run agents bar | "1 agent done" (singular) | Grammar when only one helper has finished. |
| Home | Cards, counts and the bell follow the store: new workflows appear first; "Running now", "Paused", "Needs your input", "N to approve", "Done · Launched <date>"; the bell opens the workflow that needs you, or Home | 2h. |
| Run screens with forks (4.5, 6.5, 6.6, and any run screen once a fork exists) | Branches row (Figma's 6.4 Branches + Branch tabs) at (16, 62): Original, each fork by its name in its colour (tinted when selected, "· chosen" on the chosen one), "+ New fork" (dashed, in the next fork's colour while a Fork card is open; hidden once all three colours are used). Selecting a tab focuses that lane (others muted to 40%); hidden on a frame as drawn (direct load) | 1f: a branch switcher that is always there. |
| Run screens with forks | Fork-scoped approval panel: SidePanel + Inspector header ("Approval", branch dot and name in its colour, "Ready to post"), a well with each version's lead copy ("Original: … / Vs Penny: …"), that branch's 5.1 Approval items (its own copy), footer "Use this version" + "Decide later", then "Approve all N" once chosen | 1f: forks end with per-fork approval and a choice of version. Opens from each branch's Ready to post. |
| Run screens with forks | "Chosen version" green Badge (Approved's look) over the chosen branch's Ready to post; the other branches muted to 40% | 1f: the map shows which version goes out. |
| 3.5, 4.5, 6.5, 6.6 (and any run inspector) | "Fork from here" opens the Fork card in place (6.4's state) for every step that can fork; steps other than Launch copy start with no chips (typed instruction), note and helper badges from the steps after it | 3g / 1e: no second "Fork from here" via 6.1, and forking a fork forks. |
| 3.x, 6.5, 6.6 | A fork no frame draws gets its own lane: the forked step and the steps after it copied below the map in the fork's colour (Fork 3 violet), with its fork line, Fork pill and Fork label; the map redraws smaller to fit | 1e: Create fork creates the next colour where you are. |
| 4.5, 6.5, 6.6 | A fork you named shows under your name everywhere the frame names it (lane pill and label, Tasks chip, status pill, inspector brief); the Tasks chip drops Figma's pinned width so the name fits | 2g: the fork's name and brief come from your chip or text. |
- 1.2: "Manage" menu on a connected tool (Disconnect), from the existing Menu — the button looked clickable and did nothing (4d).
- 1.2, 2.8: white fade on the right edge of the phone tab row while more tabs are offscreen — nothing hinted the row scrolls (5d).
- 1.2: transparent 40px hit area around the 16px Brand kit "More" button on phones (look unchanged) — 16×16 tap target (5d).
- 2.8: confirm dialogs (ConfirmDialog) for "Duplicate or save as template" (with a Name field) and "Archive" (Archive ↔ Restore), each followed by a toast — the side-nav items only highlighted (4d).
- 2.8: "Back to run" replaces "Start launch" when settings were opened from a run or approval — Start launch made no sense mid-run (4i).
- all screens: Toast (Menu surface: white, line-2 border, 12px radius, soft shadow; optional ghost action such as Undo), bottom-centre, 4s — confirms actions with no other visible result.
- 2.1, 2.2: attachment chips under the composer (2.1's chips, now the shared AttachmentChips) — 2.2's attach menu posted text into the chat instead of attaching (4e).
- 2.2: sent attachments appear as extra "Resources used" cards — so an attachment has a visible home after sending (4e).
- 2.2: Launch brief "Open" and "Brand guide.pdf" open a Modal with the brief's fields / what the Planner took from the guide; "Your answers in this chat" scrolls the chat to your answers (4d).
- 3.3 (all run screens' Sandbox): "Add to <step>…" menu on a row (steps that haven't started), "+" imports into that section, row checkboxes tick (solid Checkbox look) — rows looked actionable and did nothing (4f).
- 2.6, 2.7: the "Add to <helper>" row menu now also opens on desktop click, and row checkboxes tick (4g).
- 3.4 (all run screens' Decisions): "Change" opens Chat with "Change: <decision> → " typed and focused; sending it rewrites the entry ("Changed by you", "Just now") (4h).
- 3.5, 6.1: "See all N pieces" opens a Modal listing Writer's pieces (written vs not started) (4d).
- 6.3: "See previous version" opens the same Modal as the last finished copy, with your rerun note (4d).
- 4.1, 4.3: "See the full handoff (4 items)" opens a Modal listing the handoff's items, problems marked red and the rest "Passed" (4d).
- 5.1: inline edit on an approval item (Text area + Save / Cancel) — Edit used to jump to the mid-run inspector (4a).
- 5.1, 5.2: a non-"Ready to post" map card opens a read-only inspector (no Fork / Rerun / footer); "Ready to post" opens the approval panel / summary (4b, 4c).
- 4.1, 4.3, 5.1, 4.4, 6.5 (every hand-raise, inspector and approval panel), 2.6/2.7 Sandbox: on phones a bottom sheet 56% tall with a rounded top, so the status pill and the card stay visible above it (5b, 5a).
- all workflow screens: on phones the Planning / Flowchart control reads "Plan" / "Run" so the title isn't cut to "AI …", and the title chevron gets a transparent 40px hit area (5c).
- 5.2: on phones "Next time" sits right under the summary header so its buttons are above the fold (5e).
