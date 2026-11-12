import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { useGo } from '@/state/nav';

import { RERUN_NOTE_DEFAULT, rerunningRun } from './data';

export const screenId = '6.3';

// Figma 6.3 "Rerunning" (2362:26001): Writer rewrites Launch copy with the note from 6.2 (or Figma's note when the
// route is opened directly); only Community and Publisher, which use it, will rerun, and the old version is kept
// ("See previous version"). Rerun from here waits until Writer finishes.
export default function RerunningScreen() {
  const go = useGo();
  const { state } = useLocation() as { state?: { note?: string } };
  const note = state?.note?.trim() || RERUN_NOTE_DEFAULT;
  const data = useMemo(() => rerunningRun(note), [note]);
  return (
    <RunScreenLayout
      data={data}
      initialPanel={{ kind: 'inspector', nodeId: 'writer' }}
      status={{ state: 'rerunning', label: 'Rerunning · $0.21' }}
      onInspectorFork={() => go('6.4')}
    />
  );
}
