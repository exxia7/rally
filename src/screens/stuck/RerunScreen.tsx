import { useParams } from 'react-router-dom';

import { RunScreenLayout } from '@/components/run/RunScreenLayout';

import { RERUN_RUN } from './data';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['4.2', '4.2-tasks'];

// Figma 4.2 "Rerun" (2362:25201): after the rerun confirm, Strategist redoes its card while the steps it
// doesn't touch are reused; and 4.2-tasks (2362:27165) with the anchored Tasks overlay (a Close link, no bar) open
// from the "Tasks · Rerunning" chip. Writer is the next to raise its hand (4.3, price mismatch).
export default function RerunScreen() {
  const { id } = useParams();
  return (
    <RunScreenLayout
      data={RERUN_RUN}
      initialTasksOpen={id === '4.2-tasks'}
      status={{ state: 'rerunning', label: 'Rerunning · $0.22' }}
      nodeLinks={{ writer: '4.3' }}
    />
  );
}
