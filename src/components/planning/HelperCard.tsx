import clsx from 'clsx';
import type { CSSProperties } from 'react';

import { AgentAvatar, type AgentState } from '@/components/agents/AgentAvatar';
import type { AgentName } from '@/components/agents/characters';
import { type NodeKindName, NodeKindTile } from '@/components/map/NodeKind';

// Figma "Setting pair" (2362:29472): label + value row inside a helper card. Highlighted = just changed.
export function SettingPair({
  label,
  value,
  highlighted,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  const text =
    'min-h-[15px] text-[9.488px] leading-[14.231px] tracking-[-0.066px]';
  return (
    <div
      className={clsx(
        'flex w-full items-center gap-[6.6px] rounded-[4.125px] px-[4.95px] py-[3.3px]',
        highlighted && 'bg-[#fff1b8]'
      )}
    >
      <p
        className={clsx(
          text,
          'w-[34.65px] shrink-0 whitespace-nowrap text-muted'
        )}
      >
        {label}
      </p>
      <p
        className={clsx(
          text,
          'min-w-px flex-1 overflow-clip font-medium text-ink'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export type HelperCardData = {
  name: AgentName | string;
  /** Helper art over the top-right corner. */
  agent?: AgentName;
  agentState?: AgentState;
  kind?: Exclude<NodeKindName, 'task'>;
  description: string;
  settings: { label: string; value: string; highlighted?: boolean }[];
  /** "Updated" (blue badge) or "New" (blue badge + dashed border). Dimmed = not involved. */
  state?: 'default' | 'dimmed' | 'updated' | 'new';
};

// Figma "Helper card" (2362:29293): one helper on the plan map: name, job, model and tools.
// State: Default, Dimmed (not involved), Updated, New. 181.5px wide at plan-map scale.
export function HelperCard({
  name,
  agent,
  agentState = 'idle',
  kind = 'action',
  description,
  settings,
  state = 'default',
  scale,
  onClick,
  className,
  style,
}: HelperCardData & {
  /** Scaled instance (the 2.x plan map draws cards at 0.85 → 154.275px). Uses CSS zoom, so layout scales too. */
  scale?: number;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const badge =
    state === 'updated' ? 'Updated' : state === 'new' ? 'New' : null;
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={clsx(
        'relative flex w-[181.5px] flex-col items-start rounded-[8.25px] border-[0.825px] border-line-2 bg-white drop-shadow-[0px_0.825px_0.825px_rgba(16,18,24,0.04)]',
        state === 'new' ? 'border-dashed' : 'border-solid',
        state === 'dimmed' && 'opacity-40',
        onClick && 'cursor-pointer',
        className
      )}
      style={scale ? { zoom: scale, ...style } : style}
    >
      <div className="flex h-[36.3px] w-full items-center gap-[6.6px] border-b-[0.825px] border-solid border-line pr-[34px] pl-[8.25px]">
        <NodeKindTile kind={kind} size={18.15} />
        <p className="min-w-px flex-1 text-[11.55px] leading-[17.325px] font-semibold tracking-[-0.1155px] whitespace-nowrap text-ink">
          {name}
        </p>
        {badge ? (
          <div className="flex shrink-0 items-center justify-center gap-[2.96px] rounded-[4.44px] bg-accent-soft px-[4.44px] py-[1.48px]">
            <p className="text-[8.14px] leading-[11.84px] font-medium whitespace-nowrap text-accent">
              {badge}
            </p>
          </div>
        ) : (
          <div className="h-[14.8px] w-[48.2px] shrink-0" />
        )}
      </div>
      <div className="flex w-full flex-col items-start p-[6.6px]">
        <p className="min-h-3.5 w-full px-[1.65px] text-[9.9px] leading-[13.613px] tracking-[-0.066px] text-muted">
          {description}
        </p>
        <div className="flex w-full flex-col items-start pt-[6.6px]">
          <div className="flex w-full flex-col items-start rounded-[4.95px] border-[0.825px] border-solid border-line bg-well p-[3.3px]">
            {settings.map((s) => (
              <SettingPair key={s.label} {...s} />
            ))}
          </div>
        </div>
      </div>
      {agent && (
        <AgentAvatar
          agent={agent}
          state={agentState}
          size={24.75}
          className="absolute! top-[-14.95px] left-[148.5px]"
        />
      )}
    </div>
  );
}
