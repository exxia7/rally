import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import checkBadge from '@/assets/icons/check-badge.svg';
import lockAmber from '@/assets/icons/lock-amber-10.svg';
import { CompletedAgents } from '@/components/agents/CompletedAgents';
import { TaskProgressChip } from '@/components/map/CanvasControls';
import { FlowMap } from '@/components/map/FlowMap';
import { MapCanvas } from '@/components/map/MapCanvas';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { ApprovalItem, type ApprovalState } from '@/components/panels/Cards';
import { InspectorHeader } from '@/components/panels/Inspector';
import { SidePanel } from '@/components/panels/SidePanel';
import { AppShell } from '@/components/shell/AppShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { screenPath } from '@/screens/registry';

import {
  APPROVAL_DONE,
  APPROVAL_MAP_SCALE,
  LAUNCH_EDGES,
  LAUNCH_MAP,
  launchNodes,
} from './launchMap';

export const screenId = '5.1';

type Item = {
  id: string;
  title: string;
  when: string;
  body: string;
  channelNote?: string;
  /** Figma's item height: its text boxes round each line up to whole pixels. */
  minH: string;
};

const ITEMS: Item[] = [
  {
    id: 'ph',
    title: 'Product Hunt page',
    when: 'Mar 12 · 12:01am PT',
    body: 'Lumen AI Coach: the budgeting coach for people who already budget',
    minH: 'min-h-[130px]',
  },
  {
    id: 'x',
    title: 'X post',
    when: 'Mar 12 · 9am',
    body: 'Penny gives tips. AI Coach knows your actual budget. Live Mar 12.',
    minH: 'min-h-[130px]',
  },
  {
    id: 'li',
    title: 'LinkedIn post',
    when: 'Mar 12 · 9am',
    body: 'We built AI Coach for people who already budget and want someone in their corner.',
    minH: 'min-h-[130px]',
  },
  {
    id: 'discord',
    title: 'Discord post',
    when: 'Mar 12 · 11am',
    channelNote: 'Posts to your #launches channel',
    body: 'We made a budgeting coach for people who already budget. Feedback welcome',
    minH: 'min-h-[156px]',
  },
  {
    id: 'email',
    title: 'Waitlist email · 2,800 people',
    when: 'Mar 12 · 9am',
    channelNote: 'Sent with Resend from hello@lumen.app',
    body: "Subject: You're in. Meet AI Coach",
    minH: 'min-h-[139px]',
  },
];

const NODES = launchNodes('approval');

// Figma 5.1 "Approval" (2362:25491): the finished run map (drawn at 0.68 beside the docked panel) and the
// "Ready to post" approval panel. Approve / Don't post / Undo change each item; "Approve all" approves what's
// left and opens the launch summary (5.2).
export default function ApprovalScreen() {
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(true);
  const [states, setStates] = useState<Record<string, ApprovalState>>(() =>
    Object.fromEntries(ITEMS.map((i) => [i.id, 'waiting' as ApprovalState]))
  );
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const waiting = ITEMS.filter((i) => states[i.id] === 'waiting').length;
  const launch = () => {
    setStates((s) =>
      Object.fromEntries(
        Object.entries(s).map(([k, v]) => [k, v === 'waiting' ? 'approved' : v])
      )
    );
    // Let the badges flip before moving on to the summary.
    timer.current = window.setTimeout(
      () => navigate(screenPath('5.2')),
      waiting ? 600 : 0
    );
  };

  return (
    <AppShell
      sidebar="none"
      aside={
        panelOpen && (
          <SidePanel
            onClose={() => setPanelOpen(false)}
            header={
              <div className="flex min-h-[113px] w-full shrink-0 flex-col">
                <InspectorHeader
                  eyebrow="Approval · Publisher"
                  kindIcon={null}
                  title="Ready to post"
                  meta="Nothing goes out until you approve it."
                  onClose={() => setPanelOpen(false)}
                />
              </div>
            }
            bodyClassName="px-6 py-5 max-md:px-4"
            footer={
              <div className="flex w-full shrink-0 items-start gap-2 border-t border-line bg-white px-6 py-4 max-md:px-4">
                <Button
                  variant="primary"
                  className="min-w-[106px]"
                  onClick={launch}
                >
                  {waiting ? `Approve all ${waiting}` : 'Launch'}
                </Button>
                <Button
                  className="w-[101px]"
                  onClick={() => navigate(screenPath('3.2'))}
                >
                  Decide later
                </Button>
              </div>
            }
          >
            <Badge tone="green" icon={<Icon src={checkBadge} size={10} />}>
              14 handoff cards checked · 2 caught and fixed
            </Badge>
            <div className="flex w-full flex-col items-start gap-2.5">
              {ITEMS.map((item) => (
                <ApprovalItem
                  key={item.id}
                  title={item.title}
                  when={item.when}
                  body={item.body}
                  channelNote={item.channelNote}
                  state={states[item.id]}
                  onChange={(s) =>
                    setStates((all) => ({ ...all, [item.id]: s }))
                  }
                  onEdit={() => navigate(screenPath('3.5'))}
                  className={`w-full shrink-0 ${item.minH}`}
                />
              ))}
              <div className="flex w-full shrink-0 flex-col items-start rounded-[10px] border border-dashed border-line-2 p-3.5">
                <div className="flex w-[320px] max-w-full items-center gap-2">
                  <p className="min-w-px flex-1 text-[14px] leading-[20.25px] font-semibold tracking-[-0.08px] whitespace-nowrap text-muted">
                    $300 ad test
                  </p>
                  <Badge
                    tone="subtle"
                    icon={<Icon src={lockAmber} size={10} />}
                  >
                    Blocked by your rules
                  </Badge>
                </div>
                <p className="w-full pt-1.5 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
                  Ads are blocked in Permissions. Change the rule to approve
                  this.
                </p>
              </div>
            </div>
          </SidePanel>
        )
      }
    >
      <WorkflowTopBar
        view="flowchart"
        onViewChange={(v) => v === 'planning' && navigate(screenPath('2.3'))}
        status="waiting"
        statusLabel={
          waiting
            ? `${waiting + 1} waiting for your OK · $0.31`
            : 'Ready to launch · $0.31'
        }
        onSettings={() => navigate(screenPath('2.8'))}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((o) => !o)}
      />
      <MapCanvas
        stageWidth={954}
        zoomClassName="max-md:bottom-[95px]"
        overlay={
          <>
            <TaskProgressChip
              done={9}
              total={10}
              onClick={() => navigate(screenPath('3.2-tasks'))}
              className="absolute top-4 left-4 w-[208px]"
            />
            <CompletedAgents
              agents={APPROVAL_DONE}
              className="absolute bottom-[16.26px] left-4 max-md:right-4"
            />
          </>
        }
      >
        <div
          className="absolute top-[165px] left-[43px] origin-top-left"
          style={{ transform: `scale(${APPROVAL_MAP_SCALE})` }}
        >
          <FlowMap
            nodes={NODES}
            edges={LAUNCH_EDGES}
            width={LAUNCH_MAP.width}
            height={LAUNCH_MAP.height}
            onNodeClick={() => setPanelOpen(true)}
          />
        </div>
      </MapCanvas>
    </AppShell>
  );
}
