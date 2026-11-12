import { useMemo } from 'react';

import { planFrame, useGo, useRunFrameSync } from './nav';
import { agentNames, helperOfStep, runData, runStatus } from './runView';
import { dispatch, useWorkflow } from './store';

/**
 * Everything a run screen (3.2–3.5, 4.1–4.3) passes to RunScreenLayout, from the live store: the beat's map, tasks
 * and agents with your edits, the status pill, the controlled Pause, renamed helpers, and where Planning goes. Also
 * keeps the screen on its beat's frame (useRunFrameSync). `confirm`: 4.1b's variant of the hand-raise panel.
 */
export function useLiveRun(id: string, opts: { confirm?: boolean } = {}) {
  const wf = useWorkflow();
  const go = useGo();
  useRunFrameSync(id);
  const confirm = !!opts.confirm;
  const data = useMemo(() => runData(wf, { confirm }), [wf, confirm]);
  const status = useMemo(() => runStatus(wf), [wf]);
  const names = useMemo(() => agentNames(wf), [wf]);
  const needsYou = wf.run.phase === 'needsYou';
  return {
    wf,
    layout: {
      data,
      title: wf.title,
      status,
      // A raised hand holds the run: the button reads Resume (as Figma draws 4.1 and 4.3).
      paused: wf.run.paused || needsYou,
      onPauseToggle: () =>
        dispatch({ type: 'run/pause', paused: !wf.run.paused }),
      agentNames: names,
      planningTarget: planFrame(wf.planStage),
      // The inspector's Edit opens that step's helper in planning (its drawer), and Back to run returns (audit 2d).
      onEditNode: (nodeId: string) => {
        const helper = helperOfStep(nodeId);
        go(helper && wf.helpers[helper] ? '2.4' : planFrame(wf.planStage), {
          returnHere: true,
          state: helper ? { drawer: helper } : undefined,
        });
      },
    },
  };
}
