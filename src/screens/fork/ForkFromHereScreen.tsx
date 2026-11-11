import { useNavigate } from 'react-router-dom';

import { BranchTab, Branches } from '@/components/nav/BranchTab';
import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { screenPath } from '@/screens/registry';

import { FORK_FROM_STEP_RUN } from './data';

export const screenId = '6.4';

// Figma 6.4 "Fork from here" (2362:26113): from the inspector's Fork from here (6.1), Launch copy's Fork card is
// open and the canvas's Branches row (16, 62) shows the new fork's slot in Fork 1's colour while it is set up.
// Create fork starts "Vs Penny" (6.5); Cancel closes the card and the slot.
export default function ForkFromHereScreen() {
  const navigate = useNavigate();
  return (
    <RunScreenLayout
      data={FORK_FROM_STEP_RUN}
      initialPanel={{ kind: 'inspector', nodeId: 'writer', forkOpen: true }}
      onForkCreate={() => navigate(screenPath('6.5'))}
      canvasOverlay={(panel) =>
        panel?.kind === 'inspector' &&
        panel.forkOpen && (
          <Branches className="absolute top-[62px] left-4 max-w-[calc(100%-32px)]">
            <BranchTab label="Original" state="selected" />
            <BranchTab label="+ New fork" state="add" fork={1} />
          </Branches>
        )
      }
    />
  );
}
