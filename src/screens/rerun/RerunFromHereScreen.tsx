import { useState } from 'react';

import { AgentAvatar } from '@/components/agents/AgentAvatar';
import { ConfirmDialog } from '@/components/panels/ConfirmDialog';
import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { useGo } from '@/state/nav';

import { COPY_DONE_RUN, RERUN_NOTE_DEFAULT } from './data';
import { useScreenId } from '@/screens/screenId';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['6.1', '6.2'];

// Figma 6.1 "Inspector · Rerun or fork" (2362:25748): Writer has finished Launch copy; its inspector offers both
// Fork from here (→ 6.4) and Rerun from here. Rerun opens 6.2 "Rerun from here" (2362:25860): the rerun confirm with
// an optional note for what Writer should change. Confirming goes to 6.3 Rerunning with that note.
export default function RerunFromHereScreen() {
  const id = useScreenId();
  const go = useGo();
  const [confirm, setConfirm] = useState(id === '6.2');
  return (
    <>
      <RunScreenLayout
        data={COPY_DONE_RUN}
        initialPanel={{ kind: 'inspector', nodeId: 'writer' }}
        onInspectorFork={() => go('6.4')}
        onInspectorRerun={() => setConfirm(true)}
      />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={(_, note) =>
          go('6.3', { state: { note } })
        }
        title="Rerun Writer?"
        body="Rerunning “Launch copy” also reruns every agent that depends on it. Their current work will be replaced with new versions."
        note={{
          label: 'What should Writer change? (optional)',
          defaultValue: RERUN_NOTE_DEFAULT,
          placeholder: 'e.g. Make it shorter',
        }}
        affected={[
          {
            key: 'Community',
            art: <AgentAvatar agent="Community" size={24} />,
            name: 'Community',
            detail: 'Discord post',
          },
          {
            key: 'Publisher',
            art: <AgentAvatar agent="Publisher" size={24} />,
            name: 'Publisher',
            detail: 'Schedule launch',
          },
        ]}
        cost="About 40 sec · ~6k tokens · nothing is posted until you approve"
        dontShowNote="We'll warn you whenever a rerun affects other agents. You can turn this back on anytime in Workflow settings."
        confirmLabel="Rerun 3 agents"
      />
    </>
  );
}
