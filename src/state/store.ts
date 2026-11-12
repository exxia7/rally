import { useSyncExternalStore } from 'react';

import {
  briefAnswer,
  briefChat,
  type Helper,
} from '@/screens/plan/aiCoachPlan';

import {
  type CheckLevel,
  checksLabel,
  needsYourOk,
  presetRules,
} from './permissions';
import {
  approvalItems,
  branchApprovals,
  chosenBranch,
  extraWorkDelay,
  fixEffects,
  rerunScope,
} from './runView';
import { newWorkflow, sceneFor, STATE_VERSION } from './scenes';
import { BEATS, installTimeline, nextBeat, playableBeat } from './timeline';
import type {
  AppState,
  ApprovalValue,
  BeatId,
  ChatLine,
  Fork,
  HandRaiseId,
  HelperId,
  Output,
  PlanStage,
  PlanStepEdit,
  Speed,
  StepOverride,
  Workflow,
  WorkflowId,
} from './types';

// The store: one AppState in a tiny useSyncExternalStore store (no dependencies), saved to localStorage so your
// data stays across reloads and visits. Screens read it with useAppState()/useWorkflow() and change it with dispatch(action).
// Everything an action does is in `reduce` below. See CLAUDE.md "App state".
//
// Permissions/settings agent (additive): actions workspace/tool, workspace/defaultPreset, workspace/preset,
// permissions/set, helper/delete, facts/set; permissions/nextTime also sets that helper's own rule; withBeat('approval') auto-approves
// items whose helper posts without your OK and skips straight to launched when none wait (src/state/permissions.ts).

export type Action =
  | { type: 'seed'; state: AppState }
  | { type: 'reset'; state: AppState }
  | { type: 'speed'; speed: Speed }
  | { type: 'nav/push'; id: string }
  | { type: 'nav/pop' }
  /** The sidebar remembers the screen a workflow is on (`lastScreen`). */
  | { type: 'nav/last'; id: WorkflowId; screen: string }
  | { type: 'wf/new' }
  | { type: 'wf/open'; id: WorkflowId }
  | { type: 'brief/send'; text: string; attachments?: string[] }
  | { type: 'briefChat/send'; text: string; reply: string }
  /** 2.2 after a brief: the Planner's next line once it has "thought" (its questions, then "Your team is ready"). */
  | { type: 'briefChat/planner'; step: 'ask' | 'ready' }
  /** 2.2: your answer to the Planner's questions; its date and audience become the brief's When and Who. */
  | { type: 'briefChat/answer'; text: string }
  | { type: 'plan/stage'; stage: PlanStage }
  | { type: 'helper/patch'; id: HelperId; patch: Partial<Helper> }
  | { type: 'helper/remove'; id: HelperId }
  | { type: 'helper/restore'; id: HelperId }
  /** Takes a helper off the team without a trace (undoing the chat's Community; a duplicate's Undo). */
  | { type: 'helper/delete'; id: HelperId }
  | { type: 'helper/add'; id: HelperId; helper: Helper; before?: HelperId }
  | { type: 'plan/insertStep'; edit: PlanStepEdit; helper?: Helper }
  | { type: 'outputs/set'; outputs: Output[] }
  | { type: 'planChat/append'; lines: ChatLine[]; clearUndo?: boolean }
  | { type: 'run/start' }
  | { type: 'run/pause'; paused: boolean }
  | { type: 'run/advance'; wf?: WorkflowId; from: BeatId }
  | { type: 'run/step'; step: string; patch: StepOverride }
  | {
      type: 'handRaise/choose';
      id: HandRaiseId;
      choices: number[];
      other: string;
    }
  | {
      type: 'handRaise/confirm';
      id: HandRaiseId;
      choices: number[];
      other: string;
    }
  | { type: 'approval/set'; output: string; value: ApprovalValue }
  | { type: 'approval/launch' }
  | { type: 'permissions/nextTime'; rule: string; value?: 'allow' | 'keep' }
  | {
      type: 'permissions/set';
      patch: Partial<
        Pick<Workflow['permissions'], 'preset' | 'checkLevel' | 'adLimit'>
      >;
    }
  | {
      type: 'workspace/tool';
      name: string;
      connected: boolean;
      account?: string;
    }
  | { type: 'workspace/defaultPreset'; name: string }
  /** 2.8 Launch facts edits. */
  | { type: 'facts/set'; patch: Partial<Workflow['resources']['facts']> }
  | {
      type: 'workspace/preset';
      /** Adds the preset, or updates the one with this key. */
      preset: { key: string; name: string; check: CheckLevel; adLimit: number };
    }
  | { type: 'fork/create'; fork: Fork }
  | { type: 'fork/choose'; id: string }
  /** Fork-scoped approval: one output of one branch ('original' writes `approvals`, a fork its own). */
  | {
      type: 'fork/approval';
      branch: string;
      output: string;
      value: ApprovalValue;
    }
  /** A fork's copy or name changed (its lane's copy, kept when you choose it). */
  | { type: 'fork/update'; id: string; patch: Partial<Omit<Fork, 'id' | 'n'>> }
  // Controls agent (additive, audit 4d/4f/4h/4a): 2.8 Duplicate and Archive, the run Sandbox's "Add to <step>" and
  // "+", a decision's Change, and 5.1's inline edit.
  /** 2.8 "Duplicate": a draft copy (same team, settings and facts; no run, decisions or approvals), first on Home. */
  | { type: 'wf/duplicate'; title: string; from?: WorkflowId }
  /** 2.8 "Archive" / "Restore": hidden from Home, run paused. */
  | { type: 'wf/archive'; archived: boolean }
  /** Run Sandbox "Add to <step>": the resource joins that helper's files, skills or tools. */
  | {
      type: 'sandbox/give';
      section: SandboxResource;
      name: string;
      helper: HelperId;
    }
  /** Run Sandbox Import / a section's "+": a new resource nobody uses yet. */
  | { type: 'sandbox/import'; section: SandboxResource; name: string }
  /** A decision's "Change" (3.4): `id` is the decision changed, `from` its old title. */
  | { type: 'decision/change'; id: string; from: string; title: string }
  /** 5.1 inline edit of an approval item's text (the chosen version's). */
  /** `branch`: a fork-scoped approval panel's branch (default: the chosen version, as on 5.1). */
  | { type: 'approval/edit'; output: string; text: string; branch?: string };

export type SandboxResource = 'assets' | 'skills' | 'tools';

/**
 * Launch facts a changed decision states ("Launch Mar 14 at 10am · $400 budget", "Audience: students"), so the
 * steps that haven't run yet pick them up through the facts pass (dates and prices in the copy and approvals).
 */
function factsFromDecision(
  text: string
): Partial<Workflow['resources']['facts']> {
  const out: Partial<Workflow['resources']['facts']> = {};
  const date =
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{1,2})\b/i.exec(
      text
    );
  if (date)
    out.date = `${date[1][0].toUpperCase()}${date[1].slice(1, 3).toLowerCase()} ${date[2]}`;
  const time = /\b(\d{1,2}(?::\d{2})?\s?(?:am|pm))\b/i.exec(text);
  if (time) out.time = time[1].replace(/\s/g, '').toLowerCase();
  const budget = /(\$[\d,]+)\s+budget/i.exec(text);
  if (budget) out.budget = budget[1];
  const price = /(\$\d+(?:\.\d{2})?\/mo)\b/i.exec(text);
  if (price) out.price = price[1];
  const audience = /^audience:\s*(.+)$/i.exec(text.trim());
  if (audience)
    out.audience = audience[1][0].toUpperCase() + audience[1].slice(1);
  return out;
}

const KEY = 'rally:app';
/** Where the app saved before it was renamed Rally: read once, then moved to KEY. */
const OLD_KEY = 'pathfinder:app';

// Actions that don't change a workflow (so a scene's frame stays "as drawn").
const NEUTRAL = new Set([
  'workspace/tool',
  'workspace/defaultPreset',
  'workspace/preset',
  'seed',
  'reset',
  'speed',
  'nav/push',
  'nav/pop',
  'wf/open',
]);

const now = () => Date.now();
const clock = () =>
  new Date()
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();

/** "Launch our new Teams plan to existing customers" → "Teams plan launch"-ish: the brief's first words. */
export function titleFromBrief(text: string) {
  const t = text.trim().replace(/\s+/g, ' ');
  if (/ai coach/i.test(t)) return 'AI Coach launch';
  const words = t.split(' ');
  let out = '';
  for (const w of words) {
    if ((out + ' ' + w).trim().length > 32) break;
    out = (out + ' ' + w).trim();
  }
  out = out.replace(/[.,;:!?]+$/, '');
  // Don't end on a little word ("…Teams plan to").
  const SMALL = /\s+(to|for|our|the|a|an|in|of|with|and|on|at|by|from)$/i;
  while (SMALL.test(out)) out = out.replace(SMALL, '');
  return out ? out[0].toUpperCase() + out.slice(1) : 'New workflow';
}

/** Writes one branch's approvals: 'original' is `approvals`, a fork its own (a fork id not in the store is ignored). */
function setBranchApprovals(
  wf: Workflow,
  branch: string,
  approvals: Record<string, ApprovalValue>
): Workflow {
  if (branch === 'original') return { ...wf, approvals };
  return {
    ...wf,
    forks: wf.forks.map((f) => (f.id === branch ? { ...f, approvals } : f)),
  };
}

function withBeat(wf: Workflow, beat: BeatId): Workflow {
  const phase = BEATS[beat].phase;
  const run = { ...wf.run, beat, phase, beatAt: now(), pausedAt: undefined };
  if (beat === 'approval') {
    // The chosen version's items wait for your OK (the original's until you choose a fork).
    const branch = chosenBranch(wf);
    const approvals = { ...branchApprovals(wf, branch) };
    const items = approvalItems(wf);
    for (const item of items)
      approvals[item.id] =
        approvals[item.id] ??
        // A helper set to post without asking (2.4e "Just go", 5.2 "Allow") doesn't wait for your OK.
        (needsYourOk(wf, item.owner) ? 'waiting' : 'approved');
    wf = setBranchApprovals(wf, branch, approvals);
    if (items.length && items.every((i) => approvals[i.id] !== 'waiting'))
      return withBeat(wf, 'launched');
  }
  return {
    ...wf,
    run,
    status:
      phase === 'notStarted'
        ? 'draft'
        : phase === 'launched'
          ? 'done'
          : phase === 'needsYou' || phase === 'awaitingApproval'
            ? 'needsYou'
            : 'running',
    launchedOn: phase === 'launched' ? wf.resources.facts.date : wf.launchedOn,
  };
}

function reduceWorkflow(wf: Workflow, a: Action): Workflow {
  switch (a.type) {
    case 'brief/send': {
      const text = a.text.trim();
      return {
        ...wf,
        isNew: false,
        title: titleFromBrief(text),
        brief: { ...wf.brief, what: text, summary: text },
        attachments: [...wf.attachments, ...(a.attachments ?? [])],
        planStage: 'chat',
        // The conversation starts with your brief; the Planner asks its questions on 2.2 (briefChat/planner).
        briefChat: briefChat(text).slice(0, 2),
      };
    }
    case 'briefChat/planner': {
      // The scripted lines: 3 is the questions, 5 the team (after your answer, 4).
      const at = a.step === 'ask' ? 2 : 4;
      if (wf.briefChat.length !== at) return wf;
      const line = briefChat(wf.brief.what)[at];
      return { ...wf, briefChat: [...wf.briefChat, line] };
    }
    case 'briefChat/answer': {
      if (wf.briefChat.length !== 3) return wf;
      const { when, who } = briefAnswer(a.text);
      return {
        ...wf,
        brief: { ...wf.brief, when: when || wf.brief.when, who: who || wf.brief.who },
        briefChat: [...wf.briefChat, { id: '4', from: 'user', text: a.text }],
      };
    }
    case 'briefChat/send': {
      const n = wf.briefChat.length;
      return {
        ...wf,
        brief: { ...wf.brief, goal: wf.brief.goal ?? a.text },
        briefChat: [
          ...wf.briefChat,
          { id: `u${n}`, from: 'user', text: a.text },
          { id: `a${n}`, from: 'assistant', text: a.reply },
        ],
      };
    }
    case 'plan/stage':
      return { ...wf, planStage: a.stage };
    case 'helper/patch':
      if (!wf.helpers[a.id]) return wf;
      return {
        ...wf,
        helpers: { ...wf.helpers, [a.id]: { ...wf.helpers[a.id], ...a.patch } },
      };
    case 'helper/remove': {
      const h = wf.helpers[a.id];
      if (!h || wf.removed.includes(a.id)) return wf;
      return {
        ...wf,
        removed: [...wf.removed, a.id],
        planChat: [
          ...wf.planChat.map((m) => ({ ...m, undo: undefined })),
          {
            id: `removed-${a.id}-${wf.planChat.length}`,
            from: 'assistant',
            text: removalNote(wf, a.id),
            undo: { kind: 'remove', helper: a.id },
          },
        ],
      };
    }
    case 'helper/restore': {
      if (!wf.removed.includes(a.id)) return wf;
      return {
        ...wf,
        removed: wf.removed.filter((x) => x !== a.id),
        planChat: [
          ...wf.planChat.map((m) => ({ ...m, undo: undefined })),
          {
            id: `restored-${a.id}-${wf.planChat.length}`,
            from: 'assistant',
            text: `Undone. ${wf.helpers[a.id].name} is back on the team.`,
          },
        ],
      };
    }
    case 'helper/delete': {
      if (!wf.helpers[a.id]) return wf;
      const helpers = { ...wf.helpers };
      delete helpers[a.id];
      return {
        ...wf,
        helpers,
        helperOrder: wf.helperOrder.filter((x) => x !== a.id),
        removed: wf.removed.filter((x) => x !== a.id),
        outputs: wf.outputs.filter((o) => o.owner !== a.id),
      };
    }
    case 'helper/add': {
      const order = wf.helperOrder.filter((x) => x !== a.id);
      const at = a.before ? order.indexOf(a.before) : -1;
      order.splice(at < 0 ? order.length : at, 0, a.id);
      return {
        ...wf,
        helpers: { ...wf.helpers, [a.id]: a.helper },
        helperOrder: order,
        removed: wf.removed.filter((x) => x !== a.id),
      };
    }
    case 'plan/insertStep':
      return {
        ...wf,
        planSteps: [...wf.planSteps, a.edit],
        helpers: a.helper
          ? { ...wf.helpers, [a.edit.id]: a.helper }
          : wf.helpers,
        helperOrder: a.helper ? [...wf.helperOrder, a.edit.id] : wf.helperOrder,
      };
    case 'outputs/set':
      return { ...wf, outputs: a.outputs };
    case 'planChat/append':
      return {
        ...wf,
        planChat: [
          ...(a.clearUndo
            ? wf.planChat.map((m) => ({ ...m, undo: undefined }))
            : wf.planChat),
          ...a.lines,
        ],
      };
    case 'run/start': {
      if (wf.run.phase !== 'notStarted') return wf;
      const started = withBeat(
        {
          ...wf,
          planStage: 'team',
          run: { ...wf.run, startedAt: now(), paused: false, hold: undefined },
        },
        'launch'
      );
      return withBeat(started, playableBeat(started, 'launch'));
    }
    case 'run/pause': {
      const r = wf.run;
      if (a.paused === r.paused) return wf;
      return {
        ...wf,
        run: a.paused
          ? { ...r, paused: true, pausedAt: now() }
          : {
              ...r,
              paused: false,
              pausedAt: undefined,
              beatAt:
                r.beatAt && r.pausedAt
                  ? r.beatAt + (now() - r.pausedAt)
                  : r.beatAt,
            },
      };
    }
    case 'run/advance': {
      if (wf.run.beat !== a.from || !BEATS[a.from].next) return wf;
      return withBeat(
        { ...wf, run: { ...wf.run, hold: undefined } },
        nextBeat(wf, a.from)
      );
    }
    case 'run/step':
      return {
        ...wf,
        run: {
          ...wf.run,
          steps: {
            ...wf.run.steps,
            [a.step]: { ...wf.run.steps[a.step], ...a.patch },
          },
        },
      };
    case 'handRaise/choose':
      return {
        ...wf,
        handRaises: [
          ...wf.handRaises.filter((h) => h.id !== a.id),
          {
            id: a.id,
            step: a.id === 'missing' ? 'decision' : 'writer',
            helper: a.id === 'missing' ? 'strategist' : 'writer',
            choices: a.choices,
            other: a.other,
            resolved: false,
          },
        ],
      };
    case 'handRaise/confirm': {
      const beat = a.id === 'missing' ? 'handRaise1' : 'handRaise2';
      const helper = a.id === 'missing' ? 'strategist' : 'writer';
      const raise = {
        id: a.id,
        step: a.id === 'missing' ? 'decision' : 'writer',
        helper,
        choices: a.choices,
        other: a.other,
        resolved: true,
      };
      const effects = fixEffects(a.id, a.choices);
      const facts = { ...wf.resources.facts };
      for (const e of effects) Object.assign(facts, e.facts ?? {});
      const next: Workflow = {
        ...wf,
        handRaises: [...wf.handRaises.filter((h) => h.id !== a.id), raise],
        resources: { ...wf.resources, facts },
        decisions: [
          ...effects.map((e, i) => ({
            id: `${a.id}-${i}`,
            title: e.fixed,
            basis: `Your answer to ${wf.helpers[helper]?.name ?? 'the team'}`,
            time: clock(),
          })),
          ...(a.other.trim()
            ? [
                {
                  id: `${a.id}-other`,
                  title: a.other.trim(),
                  basis: 'You told the team',
                  time: clock(),
                },
              ]
            : []),
          ...wf.decisions,
        ],
        reruns:
          a.id === 'missing'
            ? [
                ...wf.reruns,
                {
                  id: `rerun-${wf.reruns.length + 1}`,
                  from: 'decision',
                  note: effects[0]?.note,
                  scope: rerunScope(wf, a.choices),
                  at: now(),
                },
              ]
            : wf.reruns,
      };
      return wf.run.beat === beat ? withBeat(next, nextBeat(next, beat)) : next;
    }
    // 5.1's approvals are the chosen version's (the original's until you choose a fork).
    case 'approval/set': {
      const branch = chosenBranch(wf);
      return setBranchApprovals(wf, branch, {
        ...branchApprovals(wf, branch),
        [a.output]: a.value,
      });
    }
    case 'approval/launch': {
      const branch = chosenBranch(wf);
      const approvals = { ...branchApprovals(wf, branch) };
      for (const item of approvalItems(wf))
        if ((approvals[item.id] ?? 'waiting') === 'waiting')
          approvals[item.id] = 'approved';
      return withBeat(setBranchApprovals(wf, branch, approvals), 'launched');
    }
    case 'permissions/nextTime': {
      const nextTime = { ...wf.permissions.nextTime };
      if (a.value) nextTime[a.rule] = a.value;
      else delete nextTime[a.rule];
      // The rule is that helper's own permission: "Allow" lets it post on its own, "Keep asking" asks first.
      const helper = RULE_HELPER[a.rule];
      const h = helper && wf.helpers[helper];
      const helpers = h
        ? {
            ...wf.helpers,
            [helper]: {
              ...h,
              checks:
                a.value === 'allow'
                  ? checksLabel('just-go', wf.permissions.checkLevel)
                  : 'Always · before posting',
            },
          }
        : wf.helpers;
      return {
        ...wf,
        helpers,
        permissions: { ...wf.permissions, nextTime },
      };
    }
    case 'facts/set':
      return {
        ...wf,
        resources: {
          ...wf.resources,
          facts: { ...wf.resources.facts, ...a.patch },
        },
      };
    case 'permissions/set':
      return { ...wf, permissions: { ...wf.permissions, ...a.patch } };
    case 'fork/create':
      return { ...wf, forks: [...wf.forks, a.fork] };
    case 'fork/choose':
      return {
        ...wf,
        chosenVersion: a.id,
        forks: wf.forks.map((f) => ({ ...f, chosen: f.id === a.id })),
      };
    case 'fork/approval':
      return setBranchApprovals(wf, a.branch, {
        ...branchApprovals(wf, a.branch),
        [a.output]: a.value,
      });
    case 'fork/update':
      return {
        ...wf,
        forks: wf.forks.map((f) => (f.id === a.id ? { ...f, ...a.patch } : f)),
      };
    // ---- Controls agent (additive) ----
    case 'wf/archive':
      if (!!wf.archived === a.archived) return wf;
      return {
        ...wf,
        archived: a.archived || undefined,
        // Archiving stops the run (paused, so the timeline holds); Restore leaves it paused for you to resume.
        run:
          a.archived && !wf.run.paused
            ? { ...wf.run, paused: true, pausedAt: now() }
            : wf.run,
      };
    case 'sandbox/give': {
      const h = wf.helpers[a.helper];
      if (!h) return wf;
      const key =
        a.section === 'skills'
          ? 'skills'
          : a.section === 'tools'
            ? 'tools'
            : 'files';
      const has = h[key] ?? [];
      const res = wf.resources[a.section];
      const found = res.some((r) => r.name === a.name);
      return {
        ...wf,
        helpers: has.includes(a.name)
          ? wf.helpers
          : { ...wf.helpers, [a.helper]: { ...h, [key]: [...has, a.name] } },
        resources: {
          ...wf.resources,
          [a.section]: found
            ? res.map((r) =>
                r.name === a.name && !r.usedBy.includes(a.helper)
                  ? { ...r, usedBy: [...r.usedBy, a.helper] }
                  : r
              )
            : [...res, { name: a.name, usedBy: [a.helper] }],
        },
      };
    }
    case 'sandbox/import': {
      const res = wf.resources[a.section];
      if (res.some((r) => r.name === a.name)) return wf;
      return {
        ...wf,
        resources: {
          ...wf.resources,
          [a.section]: [
            { name: a.name, usedBy: [], source: 'New · not used yet' },
            ...res,
          ],
        },
      };
    }
    case 'decision/change': {
      const title = a.title.trim();
      if (!title) return wf;
      const entry = {
        id: `change-${a.id}`,
        title,
        basis: `You changed it from “${a.from}”`,
        time: clock(),
        replaces: a.id,
      };
      return {
        ...wf,
        decisions: [entry, ...wf.decisions.filter((d) => d.replaces !== a.id)],
        resources: {
          ...wf.resources,
          facts: { ...wf.resources.facts, ...factsFromDecision(title) },
        },
      };
    }
    case 'approval/edit': {
      const key = `${a.branch ?? chosenBranch(wf)}:${a.output}`;
      const text = a.text.trim();
      if (!text || wf.approvalText?.[key] === text) return wf;
      return { ...wf, approvalText: { ...wf.approvalText, [key]: text } };
    }
    default:
      return wf;
  }
}

/** 5.2 "Next time" rules → the helper they're about (runView.summaryView names them). */
const RULE_HELPER: Record<string, HelperId> = {
  'community-discord': 'community',
  'publisher-schedule': 'publisher',
};

function removalNote(wf: Workflow, id: HelperId) {
  const name = wf.helpers[id].name;
  const nameOf = (h: string) => wf.helpers[h]?.name ?? h;
  const live = (h: string) => wf.helpers[h] && !wf.removed.includes(h);
  // Who passes to it and who it passes to, by the plan's handoff text ("Strategist", "Writer and Designer").
  const from = wf.helperOrder.filter(
    (h) => live(h) && h !== id && wf.helpers[h].passesTo.includes(name)
  );
  const to = wf.helperOrder.filter(
    (h) => live(h) && h !== id && wf.helpers[h].getsFrom.includes(name)
  );
  const list = (xs: string[]) =>
    xs.length <= 1
      ? xs.map(nameOf).join('')
      : `${xs.slice(0, -1).map(nameOf).join(', ')} and ${nameOf(xs[xs.length - 1])}`;
  const joined =
    from.length && to.length
      ? ` ${list(from)} now ${from.length === 1 ? 'passes' : 'pass'} straight to ${list(to)}.`
      : '';
  return `Removed ${name}.${joined} The estimate and the run update to match.`;
}

export function reduce(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'seed':
    case 'reset':
      return { ...a.state, speed: s.speed };
    case 'speed':
      return { ...s, speed: a.speed };
    case 'nav/push':
      return {
        ...s,
        returnTo: [...s.returnTo.filter((x) => x !== a.id), a.id].slice(-10),
      };
    case 'nav/pop':
      return { ...s, returnTo: s.returnTo.slice(0, -1) };
    case 'nav/last':
      return s.lastScreen?.[a.id] === a.screen
        ? s
        : { ...s, lastScreen: { ...s.lastScreen, [a.id]: a.screen } };
    case 'wf/open':
      return s.workflows[a.id] ? { ...s, activeId: a.id } : s;
    case 'workspace/tool':
      return {
        ...s,
        workspace: {
          ...s.workspace,
          tools: s.workspace.tools.some((t) => t.name === a.name)
            ? s.workspace.tools.map((t) =>
                t.name === a.name
                  ? {
                      ...t,
                      connected: a.connected,
                      account: a.connected
                        ? (a.account ?? t.account ?? 'Lumen')
                        : undefined,
                    }
                  : t
              )
            : [...s.workspace.tools, { name: a.name, connected: a.connected }],
        },
      };
    case 'workspace/defaultPreset':
      return { ...s, workspace: { ...s.workspace, defaultPreset: a.name } };
    case 'workspace/preset': {
      const p = {
        ...a.preset,
        rules: presetRules(a.preset.check, a.preset.adLimit),
      };
      const old = s.workspace.presets.find((x) => x.key === p.key);
      const presets = old
        ? s.workspace.presets.map((x) => (x.key === p.key ? p : x))
        : [...s.workspace.presets, p];
      // A renamed preset stays the one workflows (and the workspace default) use.
      const rename = (n: string) => (old && n === old.name ? p.name : n);
      return {
        ...s,
        workspace: {
          ...s.workspace,
          presets,
          defaultPreset: rename(s.workspace.defaultPreset),
        },
        workflows: old
          ? Object.fromEntries(
              Object.entries(s.workflows).map(([id, w]) => [
                id,
                w.permissions.preset === old.name
                  ? { ...w, permissions: { ...w.permissions, preset: p.name } }
                  : w,
              ])
            )
          : s.workflows,
      };
    }
    case 'wf/duplicate': {
      const src = s.workflows[a.from ?? s.activeId];
      if (!src) return s;
      const id = `wf-${now().toString(36)}`;
      const copy: Workflow = {
        ...src,
        id,
        title: a.title.trim() || `${src.title} copy`,
        status: 'draft',
        card: undefined,
        isNew: false,
        asDrawn: undefined,
        archived: undefined,
        planStage: src.planStage === 'brief' ? 'brief' : 'team',
        run: { phase: 'notStarted', beat: 'idle', paused: false, steps: {} },
        handRaises: [],
        decisions: [],
        reruns: [],
        approvals: {},
        approvalText: undefined,
        forks: [],
        chosenVersion: undefined,
        launchedOn: undefined,
      };
      return {
        ...s,
        workflows: { ...s.workflows, [id]: copy },
        order: [id, ...s.order],
      };
    }
    case 'wf/new': {
      const id = `wf-${now().toString(36)}`;
      return {
        ...s,
        workflows: { ...s.workflows, [id]: newWorkflow(id) },
        order: [id, ...s.order],
        activeId: id,
      };
    }
  }
  const id = ('wf' in a && a.wf) || s.activeId;
  const wf = s.workflows[id];
  if (!wf) return s;
  let next = reduceWorkflow(wf, a);
  if (next === wf) return s;
  if (!NEUTRAL.has(a.type) && next.asDrawn)
    next = { ...next, asDrawn: undefined };
  return { ...s, workflows: { ...s.workflows, [id]: next } };
}

// ---- The store ---------------------------------------------------------------------------------------------
// Saved in localStorage: your workflows, edits and runs stay across reloads and visits. A first visit starts from
// the workspace's starter data (`initialState`). The dev-only '/s/<frame>' sample routes seed a frame's state
// without saving it, so they never overwrite your data.

/** The starter workspace: Home's workflows, live (not frozen at Figma's literal text). */
export function initialState(): AppState {
  const s = sceneFor('1.1');
  return {
    ...s,
    workflows: Object.fromEntries(
      Object.entries(s.workflows).map(([id, wf]) => [
        id,
        { ...wf, asDrawn: undefined },
      ])
    ),
  };
}

function load(): AppState | null {
  try {
    let raw = window.localStorage.getItem(KEY);
    const old = window.localStorage.getItem(OLD_KEY);
    if (raw === null && old !== null) {
      // Copy first, so the data is never only in memory.
      window.localStorage.setItem(KEY, old);
      raw = old;
    }
    if (old !== null) window.localStorage.removeItem(OLD_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AppState;
    return s.version === STATE_VERSION && s.workflows?.[s.activeId] ? s : null;
  } catch {
    return null;
  }
}

function save(s: AppState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private mode or a full quota: the app still works, it just won't survive a reload.
  }
}

const speedParam = (): Speed | null => {
  try {
    const v = new URLSearchParams(window.location.search).get('speed');
    return v === 'fast' || v === 'normal' || v === 'hold' ? v : null;
  } catch {
    return null;
  }
};

let state: AppState =
  (typeof window === 'undefined' ? null : load()) ?? initialState();
/** False while a dev sample route shows seeded state: nothing is saved until a reload. */
let persist = true;
const urlSpeed =
  typeof window === 'undefined' || !import.meta.env.DEV ? null : speedParam();
if (urlSpeed) state = { ...state, speed: urlSpeed };

const listeners = new Set<() => void>();

export const store = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  dispatch(action: Action) {
    if (action.type === 'seed') persist = false;
    const next = reduce(state, action);
    if (next === state) return;
    state = next;
    if (persist) save(state);
    for (const fn of [...listeners]) fn();
  },
};

export const dispatch = (action: Action) => store.dispatch(action);

if (typeof window !== 'undefined') installTimeline(store, extraWorkDelay);
// Dev only: scripts (scripts/story-e2e.mjs) read and drive the store through window.__rally.
if (typeof window !== 'undefined' && import.meta.env.DEV)
  (window as unknown as { __rally: unknown }).__rally = {
    store,
    dispatch,
  };

export function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** The workflow on screen (Home cards, the bell and New workflow choose it). */
export function useWorkflow(): Workflow {
  const s = useAppState();
  return s.workflows[s.activeId];
}
