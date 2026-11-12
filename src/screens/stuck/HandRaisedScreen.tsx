import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { AgentAvatar } from '@/components/agents/AgentAvatar';
import { ConfirmDialog } from '@/components/panels/ConfirmDialog';
import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { useGo } from '@/state/nav';
import { rerunConfirm } from '@/state/runView';
import { dispatch, store } from '@/state/store';
import { useLiveRun } from '@/state/useRun';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['4.1', '4.1b'];

// Figma 4.1 "Hand raised · 2 things to fix" (2362:27564): Strategist raised its hand on the run map; the side panel
// walks through Scout's two missing facts (Fix steps, problem card, radio choices). Its last button, or the
// decision card's Rerun, opens 4.1b "Rerun confirm" (2362:27019), a modal listing the helpers that rerun too.
// Confirming starts the rerun (4.2).
export default function HandRaisedScreen() {
  const { id = '4.1' } = useParams();
  const go = useGo();
  const { wf, layout } = useLiveRun(id, { confirm: id === '4.1b' });
  const pending = wf.handRaises.find((h) => h.id === 'missing');
  const [choices, setChoices] = useState<number[]>(
    () => pending?.choices ?? [0, 0]
  );
  const [confirm, setConfirm] = useState(id === '4.1b');
  // Who reruns comes from the fixes you picked (Figma's list while the frame is untouched).
  const rerun = useMemo(() => rerunConfirm(wf, choices), [wf, choices]);
  return (
    <>
      <RunScreenLayout
        {...layout}
        initialPanel={{ kind: 'hand-raise' }}
        onHandRaiseConfirm={(picked, other) => {
          const c = picked ?? choices;
          setChoices(c);
          dispatch({
            type: 'handRaise/choose',
            id: 'missing',
            choices: c,
            other: other ?? pending?.other ?? '',
          });
          setConfirm(true);
        }}
      />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          const h = store.get().workflows[wf.id].handRaises.find(
            (x) => x.id === 'missing'
          );
          dispatch({
            type: 'handRaise/confirm',
            id: 'missing',
            choices: h?.choices ?? choices,
            other: h?.other ?? '',
          });
          go('4.2', { replace: true });
        }}
        title={rerun.title}
        body={`Rerunning "Who is this launch for?" also reruns every agent that depends on it. Their current work will be replaced with new versions.`}
        affected={rerun.affected.map((r) => ({
          key: r.agent,
          art: <AgentAvatar agent={r.agent} size={24} />,
          name: r.name,
          detail: r.step,
        }))}
        cost="About 1 min · ~8k tokens · nothing is posted until you approve"
        dontShowNote="We'll warn you whenever a rerun affects other agents. You can turn this back on anytime in Workflow settings."
        confirmLabel={rerun.confirmLabel}
      />
    </>
  );
}
