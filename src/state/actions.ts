import { resumeTarget, useGo } from './nav';
import { runFrame } from './runView';
import { dispatch, store } from './store';
import type { Workflow } from './types';

// Small hooks for actions several screens share (one owner per behaviour).

/** "Start launch": starts the run if it hasn't started, then opens it where it is (3.2 when just started). */
export function useStartLaunch() {
  const go = useGo();
  return () => {
    dispatch({ type: 'run/start' });
    const s = store.get();
    go(runFrame(s.workflows[s.activeId]));
  };
}

/** "New workflow" (Home, the sidebar): a fresh draft, opened at its brief (2.1). */
export function useNewWorkflow() {
  const go = useGo();
  return () => {
    dispatch({ type: 'wf/new' });
    go('2.1');
  };
}

/** Opens a workflow: at `at`, else where you left it (the sidebar's list). */
export function useOpenWorkflow() {
  const go = useGo();
  return (wf: Workflow, at?: string) => {
    dispatch({ type: 'wf/open', id: wf.id });
    go(at ?? resumeTarget(wf, store.get().lastScreen?.[wf.id]));
  };
}
