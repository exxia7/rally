import clsx from 'clsx';

import { AgentAvatar } from './AgentAvatar';
import type { AgentName } from './characters';

// Figma's widths for each Done agent (its name box rounds up wider than Chrome's text).
const DONE_AGENT_W: Record<AgentName, number> = {
  Planner: 36,
  Scout: 30,
  Insights: 37,
  Strategist: 46,
  Writer: 30,
  Designer: 42,
  Community: 54,
  Publisher: 44,
};

// Figma "Done agent" (2362:29175): avatar (Done) + name.
export function DoneAgent({ agent }: { agent: AgentName }) {
  return (
    <div
      className="flex shrink-0 flex-col items-center gap-0.5"
      style={{ minWidth: DONE_AGENT_W[agent] }}
    >
      <AgentAvatar
        agent={agent}
        state="done"
        badgeText={{ size: 10, leading: 14 }}
      />
      <p className="pt-px text-[10px] leading-[14px] tracking-[-0.0503px] whitespace-nowrap text-muted">
        {agent}
      </p>
    </div>
  );
}

// Figma "Completed agents" (2362:30097): bottom-left canvas tray of finished helpers.
// Place 16px from the canvas left and bottom. Under 768px it scrolls sideways instead of overflowing.
export function CompletedAgents({
  agents,
  label,
  className,
}: {
  agents: AgentName[];
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2.5 rounded-[10px] border border-line bg-white pt-2 pr-3 pb-1.5 pl-3.5 max-md:max-w-full max-md:overflow-x-auto',
        className
      )}
    >
      <p className="min-w-[83px] shrink-0 text-[12px] leading-[18px] font-semibold tracking-[-0.0503px] whitespace-nowrap text-ink">
        {label ?? `${agents.length} agents done`}
      </p>
      <div className="h-7 w-px shrink-0 bg-line" />
      {agents.map((a) => (
        <DoneAgent key={a} agent={a} />
      ))}
    </div>
  );
}
