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
| 1.2 | "Manage" on a connected tool opens a small Menu: Disconnect | 4d: the button looked clickable and did nothing. |
| 1.2, 2.8 (phones) | White fade on the right edge of the settings tab row while more tabs are offscreen | 5d: nothing hinted that the row scrolls. |
| 1.2 (phones) | Transparent 40px hit area around the 16px Brand kit "More" button (look unchanged) | 5d: 16×16 tap target. |
| 2.8 | "Duplicate or save as template" and "Archive" open a ConfirmDialog (Duplicate has a Name field; Archive becomes Restore once archived), then a Toast (Duplicate's has Open; Archive's has Undo). The copy is a draft first on Home; an archived workflow leaves Home and the bell, its run paused | 4d: the side-nav items only highlighted. |
| 2.8 | Opened from a run or approval: "Back to run" replaces "Start launch", and Back / the settings toggle / Flowchart return there | 4i: Start launch and "Back to the map → 2.3" made no sense mid-run. |
| Any screen | Toast: Menu surface (white, line-2 border, 12px radius, soft shadow), 13px Medium ink, optional ghost action; bottom-centre, above the phone tab bar, hides after 4s | Confirms an action whose result isn't otherwise visible. |
| 2.1, 2.2 | Attachment chips under the composer (2.1's chips, now the shared AttachmentChips) | 4e: 2.2's attach menu posted its label into the chat instead of attaching. |
| 2.2 | Sent attachments join "Resources used" as extra cards | 4e: an attachment needs a visible home after sending. |
| 2.2 | Launch brief "Open" and "Brand guide.pdf" open a Modal (the brief's fields / what the Planner took from the guide); "Your answers in this chat" scrolls the chat to your answers | 4d: card-looking buttons that did nothing. |
| 3.3 (every run Sandbox) | Row click opens an "Add to <step>…" Menu (steps that haven't started; the row's "used by" updates); a section's "+" imports into it; row checkboxes tick (solid Checkbox look) | 4f: rows looked actionable and nothing happened. |
| 2.6, 2.7 | The "Add to <helper>" row menu also opens on a desktop click; row checkboxes tick | 4g: a click on a drag-only row did nothing. |
| 3.4 (every run Decisions tab) | "Change" opens Chat with "Change: <decision> → " typed and focused; sending it rewrites the entry ("Changed by you", "Just now") and the reply says so | 4h: Change only switched tabs and typed changes got a generic reply. |
| 3.5, 6.1 | "See all N pieces" opens a Modal listing Writer's pieces (written vs not started yet) | 4d. |
| 6.3 | "See previous version" opens the same Modal as the last finished copy, with your rerun note | 4d. |
| 4.1, 4.3 | "See the full handoff (4 items)" opens a Modal listing the handoff: the problems in red, the rest "Passed" | 4d. |
| 5.1 | Approval item "Edit" edits the text in place (Text area + Save / Cancel) | 4a: Edit jumped to the mid-run Writer inspector. |
| 5.1, 5.2 | A map card other than "Ready to post" opens a read-only inspector (no Fork / Rerun / footer); "Ready to post" opens the approval panel / summary | 4b, 4c: every card opened the same panel. |
| 4.1, 4.3, 5.1, 4.4, 6.5, 2.6, 2.7 (phones) | Hand-raise, inspector, approval and plan Sandbox panels are a bottom sheet 56% tall with a rounded top; the run map opens with the card in the band above it; 2.6/2.7 start with the Sandbox open | 5b, 5a: full-screen sheets hid the map and the status pill. |
| 2.3–2.7 (phones) | The plan map opens at 1.2× instead of 0.8× | 5a: plan cards read at ~7px. |
| Every workflow screen (phones) | Planning / Flowchart reads "Plan" / "Run"; transparent 40px hit area around the title chevron (look unchanged) | 5c: the title was cut to "AI …" and the chevron was a 14px target. |
| 5.2 (phones) | "Next time" sits right under the summary header | 5e: its Allow / Keep asking buttons were below the fold. |
| 2.3 | The "You approve" gate opens Publisher's drawer (its "Checks with you") | 4d: the gate looked clickable and did nothing. |
| 2.3–2.5 (helper drawer) | "Checks with you" menu has four choices: "Team default · <the team's level>", "Always · before …", "Only when it spends money", "Never · run on its own" | 2i: the drawer, 2.4e's picker and 5.2's "Next time" are one setting; the drawer needs 2.4e's middle choice too. |
| 2.3–2.5 | A poster's Posts / Ads row opens its 2.4e "Before … runs" picker (the card itself opens the drawer) | 2d / 2i: every card opens that helper; the picker stays one click away. |
| 2.3–2.5 | Duplicate adds "<Name> copy" (New card, dashed) under the original in its column with the original's lines, opens its drawer, and the chat says so | 3i. |
| 2.3–2.5, 2.4b | After the first edit, a tool the workspace hasn't connected reads amber (#a66600, "Your OK"'s colour) with the 7px amber lock in its card's Tools row, which stays one line; that name is its own button and opens the connect step on that tool (the rest of the row still opens the tool picker). The tool rows say "Not connected" (direct loads keep Figma's text) | 3d: one connection status everywhere; "(not connected)" wrapped the row at 0.85. |
| 2.3–2.5, 2.8, 1.2 | Connect step: Modal "Connect a tool" (workspace tools with Connected badges / Connect) or "Connect <tool>" (Account field, Cancel / Connect). Opens from the drawer's and tool picker's "Connect a tool", a card's amber tool name, 2.8's LinkedIn toggle and 1.2's Connect; closing returns where you were (the drawer gets the tool) | 3j, 3d, 1g. |
| 2.3–2.5 (chat, once the run has started) | The intro's last sentence reads "Changes you make here apply to steps that haven't started." instead of "When it looks right, press Start launch.", and a generic reply is "Got it. I'll apply that to the steps that haven't started yet." (same check as "Back to run") | Mid-run there is no Start launch to press. |
| 2.7, 2.8 | "Save as a new preset" / "Save these as a new preset" opens an inline name field (Text input + Save / Cancel); the preset joins 1.2's list and the chips | 1g: it used to leave for workspace settings. |
| 2.7, 2.8 | The ad limit ("$50") is clickable and turns into a small number field (Enter saves) | 3e: "Change rule" needs a rule you can change. |
| 2.8 | "Check with you" shows "Changed here" (blue, like the ad limit) when it differs from the preset; the ad limit shows "From preset" when it matches | 2i: badges follow the shared setting. |
| 2.8 | Spending cap reads "Used $<live run cost> so far" | 3e. |
| 2.8 | The back button names where it returns: "Back to the map" / "Back to the run" / "Back to approvals" / "Back to the summary" | 1g: settings return to the screen that opened them. |
| 1.2 | Preset "Edit" and "New preset" open a preset editor Modal (Name, 2.7's check-level radios, ad limit, the rules line it will show) | 1g: preset editing stays in workspace settings. |
| 1.2 | "Back to <workflow>" (Secondary Small, 2.8's style) above the title when a workflow opened workspace settings | 1g. |
| 2.3–2.8 (mid-run) | A 36px accent-soft strip under the top bar: "The run is live. Changes apply to steps that haven't started."; the main action reads "Back to run" | 3h. |
| 3.x run map | A poster set to post on its own loses "Your OK"; "Ready to post" reads "Posts on its own" when nobody asks; the run Sandbox's Permissions rows follow the rules and the ad limit | 2i. |
| 5.2 | An item you edited on 5.1 shows "Your edit: “…”" under its "What went out" row (the row grows to fit) | 4a: the edited text has to be visible where the summary lists what went out. |
| 5.1 | When you chose a fork ("Use this version"): the header's branch dot and name in that fork's colour, and the items, counts and approvals are that version's | 1f: you approve the version that goes out. |
| 5.2 | "What went out · <fork name>" when a fork was chosen; its rows are that version's outputs and approvals | 1f. |
| Home | Card line ends "· <fork name>" when the chosen version isn't the original ("Launched Mar 14 · Post at noon") | 1f. |
| Run screens with forks | Status pill counts forks: "Running · <fork> · $x" for one, "<n> forks · $x" for more; each fork no frame draws adds $0.015 per lane step | 2g / 3e: the pill shouldn't say "2 forks" after a third. |
| 3.x–5.1 run maps | A helper you added on a line (2.4c) or duplicated is its own run step: a new column between the steps its line joined (later columns move right, the map draws smaller), lines reconnected through it, a task row, "Waits for <helper>" → "Working" → "Done"; the beat it works in runs 2.5s longer | 2b: plan edits reach the run. |
| 2.8 → run, 5.1, 5.2 | Launch facts are all the workflow's: editing Audience or Approved claim saves them (like date and price). The audience shows in 4.3's handoff; a changed claim replaces "AI Coach knows your actual budget" in the X post (run map, approvals, summary). Reached in-app, 2.8 shows the workflow's own audience and claim; a direct load shows Figma's text, which the first edit keeps | Facts you edit should carry on. |
| 2.1 | Send (or Enter) with an empty brief focuses the brief and its placeholder reads "Write your launch brief first, or pick a starter above." until you type or pick a starter; Send stays the enabled blue button Figma draws | Send did nothing on an empty brief. |

- Settings nav (1.2, 2.7, 2.8): Selected item is a grey fill (`bg-hover`) with no shadow, instead of Figma's white
  chip + drop shadow. Workspace settings (1.2) nav lists only the 5 sections that have cards, in page order
  (Figma also had General and Notifications, which had no content).

- Brief composer (2.1): model picker ("Sonnet 5.5 ⌄": Opus / Sonnet / Haiku 5.5) and effort picker ("Medium effort ⌄":
  Low / Medium / High) beside the attach button. Ghost 32px buttons, shared Menu with a check on the current choice.
  Saved per workflow (`model`, `effort`; actions `brief/model`, `brief/effort`). Each model shows its maker's logo
  (Claude: `assets/icons/claude.svg`, Simple Icons, #D97757); new makers add a logo in `MAKER_LOGOS`.

- Run Sandbox tab (3.3 and run frames): no Primary "Import" beside the panel tabs (Figma has one); each section's
  "+" imports into it. The note is shortened to "Running now · new items only reach steps that haven't started."

- Side panel tabs (Chat · Sandbox · Decisions, plan and run): underline page tabs on the header's bottom line instead
  of Figma's segmented pill "Panel tabs", so they don't look like the top bar's Planning / Flowchart switch. Decisions'
  count is a small grey chip. Each tab has a 14px Lucide icon in the tab's text colour (`message-circle.svg`,
  `box.svg`, `diamond-outline.svg`, from lucide-static 0.460.0). The plan Sandbox's note moved from its 88px header into the top of the panel body.

- Side panel chat composer (plan and run Chat tab): a second row under the field with a ghost "+" (attach menu above
  it: Upload files / Paste a link / Add a skill) and the model picker (same choice as 2.1, saved on the workflow), send
  arrow on the right. Attachments show as chips above the field and go out with the message ("· Attached: …").
