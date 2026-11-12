import { useGo } from './nav';
import { runFrame } from './runView';
import { dispatch, store } from './store';

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
