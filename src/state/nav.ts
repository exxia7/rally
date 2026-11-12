import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { parsePath, screenPath } from '@/screens/registry';

import { FRAME_FAMILY, runFrame } from './runView';
import { dispatch, store, useWorkflow } from './store';
import type { Workflow } from './types';

// Navigation. Screens move by frame id with `useGo()` (`go('3.2')`), which goes to that screen's URL for the workflow
// on screen ('/w/<id>/run'; src/screens/registry.ts). The store lives in localStorage, so any URL, a reload or Back
// renders your saved data. `carried` in history state is only read by the dev-only '/s/<frame>' sample routes.

export type Carried = { carried: true; [key: string]: unknown };
export const CARRY: Carried = { carried: true };
export const isCarried = (state: unknown): boolean =>
  !!state && typeof state === 'object' && (state as Carried).carried === true;

/** The frame id a path shows ('/' → 1.1, '/w/<id>/run' → 3.2), or null when it's no screen. */
export function idFromPath(pathname: string): string | null {
  return parsePath(pathname)?.id ?? null;
}

/** The URL of frame `id` for the workflow on screen. */
const pathOf = (id: string) => screenPath(id, store.get().activeId);

export type GoOptions = {
  replace?: boolean;
  /** Remember this screen, so the next `go.back()` returns here (settings, Sandbox, connect a tool…). */
  returnHere?: boolean;
  /** Extra history state for the next screen (e.g. 6.3's rerun note). */
  state?: Record<string, unknown>;
};

export type Go = ((id: string, opts?: GoOptions) => void) & {
  /** Back to the screen that opened this one (the return-to stack), else `fallback`. */
  back: (fallback: string) => void;
  /** The screen `back` would return to. */
  backTarget: (fallback: string) => string;
};

/** `go('3.2')` moves to a frame with the live store; `go.back('2.3')` returns to whoever opened this screen. */
export function useGo(): Go {
  const navigate = useNavigate();
  const location = useLocation();
  const here = idFromPath(location.pathname);
  const go = useCallback(
    (id: string, opts: GoOptions = {}) => {
      if (opts.returnHere && here) dispatch({ type: 'nav/push', id: here });
      navigate(pathOf(id), {
        replace: opts.replace,
        state: { ...opts.state, carried: true },
      });
    },
    [navigate, here]
  );
  return useMemo(() => {
    const backTarget = (fallback: string) => {
      const stack = store.get().returnTo.filter((x) => x !== here);
      return stack[stack.length - 1] ?? fallback;
    };
    const back = (fallback: string) => {
      const target = backTarget(fallback);
      const s = store.get().returnTo;
      // Pop everything down to (and including) the target.
      const i = s.lastIndexOf(target);
      for (let n = i < 0 ? 0 : s.length - i; n > 0; n--)
        dispatch({ type: 'nav/pop' });
      navigate(pathOf(target), { state: CARRY });
    };
    return Object.assign(go, { back, backTarget });
  }, [go, navigate, here]);
}

/** Where the Flowchart toggle goes: the run's current frame, or 3.1 when nothing has run yet. */
export function useFlowchartTarget() {
  const wf = useWorkflow();
  return runFrame(wf);
}

/** Where a workflow opens from Home or the bell: where it is now (its brief, chat, map, run or summary). */
export function cardTarget(wf: Workflow) {
  if (wf.run.phase === 'notStarted') return planFrame(wf.planStage);
  return runFrame(wf);
}

/** A workflow's frame from a frame id, without a direct load's overlay ('3.2-tasks' → '3.2'); null for Home (1.1)
 *  and workspace settings (1.2), which aren't a workflow's. */
export function workflowFrame(id: string | null) {
  if (!id || id === '1.1' || id === '1.2') return null;
  return id.replace(/-(tasks|attach)$/, '');
}

/** Where the sidebar reopens a workflow: the screen it was last on (`lastScreen`), else where it is now. Before its
 *  run starts only the planning frames and the empty Flowchart (3.1) count; run screens follow the beat themselves. */
export function resumeTarget(wf: Workflow, last?: string) {
  if (!last) return cardTarget(wf);
  if (wf.run.phase === 'notStarted' && !(last.startsWith('2.') || last === '3.1'))
    return cardTarget(wf);
  return last;
}

/** Where the Planning toggle goes: the brief (2.1), the chat (2.2) or the team map (2.3). */
export function planFrame(stage: 'brief' | 'chat' | 'team') {
  return stage === 'brief' ? '2.1' : stage === 'chat' ? '2.2' : '2.3';
}

/**
 * Keeps a run screen on the frame its beat looks like: when the timeline moves on (Strategist raises its hand,
 * approvals are ready), the screen replaces itself with that beat's frame, so the hand-raise or approval panel opens
 * where you are. `id` is the screen's own frame id.
 */
export function useRunFrameSync(id: string) {
  const wf = useWorkflow();
  const go = useGo();
  const target = runFrame(wf);
  const family = FRAME_FAMILY[id];
  const targetFamily = FRAME_FAMILY[target];
  useEffect(() => {
    if (wf.backend && id === '5.2') return;
    if (family && targetFamily && family !== targetFamily)
      go(target, { replace: true });
  }, [family, targetFamily, target, go, wf.backend, id]);
}
