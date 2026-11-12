import type { AppState, BeatId, HelperId, RunPhase, Workflow } from './types';

// The run's scripted timeline. Each beat is one moment of the story the Figma run frames tell
// (3.2 → hand raise 4.1 → 4.1b → rerun 4.2 → Writer's hand raise 4.3 → approval 5.1 → launched 5.2), plus three
// in-between beats Figma doesn't draw (launch, deciding, finishing). A beat with `next` advances on its own after
// `delay` ms while the run is running and not paused; a beat without one waits for you (`after` is where your
// answer takes it). A beat whose `needs` helper you removed is skipped. The run's view of each beat (map, tasks,
// agents…) is src/state/runView.ts.

export type Beat = {
  id: BeatId;
  /** The Figma frame this beat looks like (where run screens put you: see useRunFrameSync). */
  frame: string;
  phase: RunPhase;
  next?: BeatId;
  delay?: number;
  /** Where confirming takes it (hand raises, approval). */
  after?: BeatId;
  /** Spend at this beat for the run team Figma draws (scaled by the live team: runView.runCost). */
  cost: number;
  /** Skipped when this helper is removed. */
  needs?: HelperId;
};

export const BEATS: Record<BeatId, Beat> = {
  idle: { id: 'idle', frame: '3.1', phase: 'notStarted', cost: 0 },
  launch: {
    id: 'launch',
    frame: '3.2',
    phase: 'running',
    next: 'deciding',
    delay: 3500,
    cost: 0.04,
  },
  deciding: {
    id: 'deciding',
    frame: '3.2',
    phase: 'running',
    next: 'running',
    delay: 3500,
    cost: 0.11,
    needs: 'strategist',
  },
  running: {
    id: 'running',
    frame: '3.2',
    phase: 'running',
    next: 'handRaise1',
    delay: 5000,
    cost: 0.18,
  },
  handRaise1: {
    id: 'handRaise1',
    frame: '4.1',
    phase: 'needsYou',
    after: 'rerun',
    cost: 0.21,
    needs: 'strategist',
  },
  rerun: {
    id: 'rerun',
    frame: '4.2',
    phase: 'rerunning',
    next: 'handRaise2',
    delay: 4500,
    cost: 0.22,
    needs: 'strategist',
  },
  handRaise2: {
    id: 'handRaise2',
    frame: '4.3',
    phase: 'needsYou',
    after: 'finishing',
    cost: 0.23,
    needs: 'writer',
  },
  finishing: {
    id: 'finishing',
    frame: '3.2',
    phase: 'running',
    next: 'approval',
    delay: 4000,
    cost: 0.28,
  },
  approval: {
    id: 'approval',
    frame: '5.1',
    phase: 'awaitingApproval',
    after: 'launched',
    cost: 0.31,
  },
  launched: { id: 'launched', frame: '5.2', phase: 'launched', cost: 0.34 },
};

/** The beat after `from` (its `next`, or `after` once you answered), skipping beats whose helper is gone. */
export function nextBeat(wf: Workflow, from: BeatId): BeatId {
  let id = BEATS[from].next ?? BEATS[from].after ?? from;
  for (let i = 0; i < 10; i++) {
    const needs = BEATS[id].needs;
    if (!needs || (wf.helpers[needs] && !wf.removed.includes(needs))) return id;
    id = BEATS[id].next ?? BEATS[id].after ?? id;
  }
  return id;
}

/** The first beat at or after `id` that this team can play. */
export function playableBeat(wf: Workflow, id: BeatId): BeatId {
  const needs = BEATS[id].needs;
  if (!needs || (wf.helpers[needs] && !wf.removed.includes(needs))) return id;
  return nextBeat(wf, id);
}

const SPEED = { normal: 1, fast: 0.1, hold: 0 } as const;

type Store = {
  get: () => AppState;
  subscribe: (fn: () => void) => () => void;
  dispatch: (action: { type: 'run/advance'; wf: string; from: BeatId }) => void;
};

/** Drives the active workflow's run: one timer for its current beat, rescheduled whenever the run changes. */
export function installTimeline(store: Store) {
  let key = '';
  let timer: number | undefined;
  const schedule = () => {
    const s = store.get();
    const wf = s.workflows[s.activeId];
    if (!wf) return;
    const { run } = wf;
    const beat = BEATS[run.beat];
    const k = `${wf.id}|${run.beat}|${run.paused}|${run.hold}|${run.beatAt}|${s.speed}`;
    if (k === key) return;
    key = k;
    window.clearTimeout(timer);
    timer = undefined;
    if (!beat.next || run.paused || run.hold || s.speed === 'hold') return;
    const delay = (beat.delay ?? 3000) * SPEED[s.speed];
    const elapsed = run.beatAt ? Date.now() - run.beatAt : 0;
    timer = window.setTimeout(
      () => store.dispatch({ type: 'run/advance', wf: wf.id, from: run.beat }),
      Math.max(0, delay - Math.max(0, elapsed))
    );
  };
  schedule();
  return store.subscribe(schedule);
}
