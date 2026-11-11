import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import play from '@/assets/icons/play.svg';
import { CompletedAgents } from '@/components/agents/CompletedAgents';
import { TaskProgressChip } from '@/components/map/CanvasControls';
import { FlowMap } from '@/components/map/FlowMap';
import { MapCanvas } from '@/components/map/MapCanvas';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { AppShell } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PauseIcon } from '@/components/ui/PauseIcon';
import { screenPath } from '@/screens/registry';

import {
  AI_COACH_DONE,
  AI_COACH_EDGES,
  AI_COACH_MAP,
  AI_COACH_NODES,
} from './aiCoachMap';

export const screenId = '3.2';

// Figma 3.2 "Running" (2362:24736): the run flowchart while helpers work.
export default function RunningScreen() {
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);

  return (
    <AppShell sidebar="none">
      <WorkflowTopBar
        view="flowchart"
        onViewChange={(v) => v === 'planning' && navigate(screenPath('2.3'))}
        status={paused ? 'paused' : 'running'}
        statusLabel={paused ? 'Paused · $0.18' : 'Running · $0.18'}
        onSettings={() => navigate(screenPath('2.8'))}
        onTogglePanel={() => navigate(screenPath('3.3'))}
        action={
          <Button
            leading={paused ? <Icon src={play} size={12} /> : <PauseIcon />}
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Resume' : 'Pause'}
            className="max-md:px-2"
          >
            {/* Icon-only on phones. */}
            <span className="max-md:hidden">{paused ? 'Resume' : 'Pause'}</span>
          </Button>
        }
      />
      <MapCanvas
        zoomClassName="max-md:bottom-[95px]"
        overlay={
          <>
            <TaskProgressChip
              done={4}
              total={10}
              onClick={() => navigate(screenPath('3.2-tasks'))}
              className="absolute top-4 left-4 w-[208px]"
            />
            <CompletedAgents
              agents={AI_COACH_DONE}
              className="absolute bottom-[16.26px] left-4 max-md:right-4"
            />
          </>
        }
      >
        <FlowMap
          x={AI_COACH_MAP.x}
          y={AI_COACH_MAP.y}
          nodes={AI_COACH_NODES}
          edges={AI_COACH_EDGES}
          width={AI_COACH_MAP.width}
          height={AI_COACH_MAP.height}
          onNodeClick={() => navigate(screenPath('3.5'))}
        />
      </MapCanvas>
    </AppShell>
  );
}
