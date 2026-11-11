import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AgentAvatar } from '@/components/agents/AgentAvatar';
import type { AgentName } from '@/components/agents/characters';
import { ConfirmDialog } from '@/components/panels/ConfirmDialog';
import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { screenPath } from '@/screens/registry';

import { HAND_RAISED_RUN, HAND_RAISED_RUN_CONFIRM } from './data';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['4.1', '4.1b'];

const ALSO_RERUN: [AgentName, string][] = [
  ['Writer', 'Launch copy'],
  ['Designer', 'Visuals'],
  ['Community', 'Discord post'],
  ['Publisher', 'Schedule launch'],
];

// Figma 4.1 "Hand raised · 2 things to fix" (2362:27564): Strategist raised its hand on the run map; the side panel
// walks through Scout's two missing facts (Fix steps, problem card, radio choices). Its last button, or the
// decision card's Rerun, opens 4.1b "Rerun confirm" (2362:27019), a modal listing the helpers that rerun too.
// Confirming starts the rerun (4.2).
export default function HandRaisedScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(id === '4.1b');
  return (
    <>
      <RunScreenLayout
        data={id === '4.1b' ? HAND_RAISED_RUN_CONFIRM : HAND_RAISED_RUN}
        initialPanel={{ kind: 'hand-raise' }}
        initialPaused
        status={{ state: 'waiting', label: 'Needs you · $0.21' }}
        onHandRaiseConfirm={() => setConfirm(true)}
      />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => navigate(screenPath('4.2'))}
        title="Rerun Strategist?"
        body={`Rerunning "Who is this launch for?" also reruns every agent that depends on it. Their current work will be replaced with new versions.`}
        affected={ALSO_RERUN.map(([agent, step]) => ({
          key: agent,
          art: <AgentAvatar agent={agent} size={24} />,
          name: agent,
          detail: step,
        }))}
        cost="About 1 min · ~8k tokens · nothing is posted until you approve"
        dontShowNote="We'll warn you whenever a rerun affects other agents. You can turn this back on anytime in Workflow settings."
        confirmLabel="Rerun 5 agents"
      />
    </>
  );
}
