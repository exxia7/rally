
import { useCreateFork } from '@/components/fork/useForkRunView';
import { BranchTab, Branches } from '@/components/nav/BranchTab';
import { RunScreenLayout } from '@/components/run/RunScreenLayout';
import { useGo } from '@/state/nav';

import { FORK_FROM_STEP_RUN } from './data';
import { VS_PENNY } from './drawnForks';

export const screenId = '6.4';

// Figma 6.4 "Fork from here" (2362:26113): from the inspector's Fork from here (6.1), Launch copy's Fork card is
// open and the canvas's Branches row (16, 62) shows the new fork's slot in Fork 1's colour while it is set up.
// Create fork starts "Vs Penny" (6.5); Cancel closes the card and the slot.
export default function ForkFromHereScreen() {
  const go = useGo();
  const createFork = useCreateFork();
  return (
    <RunScreenLayout
      data={FORK_FROM_STEP_RUN}
      initialPanel={{ kind: 'inspector', nodeId: 'writer', forkOpen: true }}
      // The fork is named from the chip or text you chose (2g); 6.5 draws it under that name.
      onForkCreate={(from, instruction) => {
        createFork({
          from,
          parent: 'original',
          instruction,
          drawnName: VS_PENNY.name,
        });
        go('6.5');
      }}
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
