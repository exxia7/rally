import clsx from 'clsx';

import { useAdded, useChangedFrom } from '@/lib/motion';

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
export function DoneAgent({
  agent,
  name,
  isNew,
}: {
  agent: AgentName;
  name?: string;
  /** Motion: it just finished, so it slides into the tray. */
  isNew?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex shrink-0 flex-col items-center gap-0.5',
        isNew && 'pf-tray-in'
      )}
      style={{ minWidth: DONE_AGENT_W[agent] }}
    >
      <AgentAvatar
        agent={agent}
        state="done"
        badgeText={{ size: 10, leading: 14 }}
      />
      <p
        title={name ?? agent}
        className="max-w-20 truncate pt-px text-[10px] leading-[14px] tracking-[-0.0503px] text-muted"
      >
        {name ?? agent}
      </p>
    </div>
  );
}

// Figma "Completed agents" (2362:30097): bottom-left canvas tray of finished helpers.
// Place 16px from the canvas left and bottom. Under 768px it scrolls sideways instead of overflowing.
export function CompletedAgents({
  agents,
  names,
  label,
  motionKey,
  className,
}: {
  /** Remembers who was in the tray across beats (src/lib/motion.ts). */
  motionKey?: string;
  agents: AgentName[];
  /** Renamed helpers: character → the name you gave it. */
  names?: Partial<Record<AgentName, string>>;
  label?: string;
  className?: string;
}) {
  const added = useAdded(motionKey, agents);
  const text =
    label ??
    `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'} done`;
  const textFrom = useChangedFrom(motionKey && `${motionKey}:label`, text);
  return (
    <div
      className={clsx(
        // Never under the zoom controls pinned bottom-right (about 172px + 16px in, plus a 16px gap): scrolls
        // sideways instead. Phones move the zoom controls above it, so it takes the full width there.
        'flex max-w-[calc(100%-220px)] items-center gap-2.5 rounded-[10px] border border-line bg-white pt-2 pr-3 pb-1.5 pl-3.5 max-xl:overflow-x-auto max-xl:[scrollbar-width:none] max-md:max-w-full',
        className
      )}
    >
      <p className="min-w-[83px] shrink-0 text-[12px] leading-[18px] font-semibold tracking-[-0.0503px] whitespace-nowrap text-ink">
        <span key={text} className={textFrom !== undefined ? 'pf-tick' : undefined}>
          {text}
        </span>
      </p>
      <div className="h-7 w-px shrink-0 bg-line" />
      {agents.map((a) => (
        <DoneAgent
          key={a}
          agent={a}
          name={names?.[a]}
          isNew={added.has(a)}
        />
      ))}
    </div>
  );
}
