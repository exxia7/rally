import clsx from 'clsx';
import { type CSSProperties, Fragment } from 'react';

import lock from '@/assets/icons/lock-amber.svg';
import { AgentAvatar, type AgentState } from '@/components/agents/AgentAvatar';
import type { AgentName } from '@/components/agents/characters';
import { type NodeKindName, NodeKindTile } from '@/components/map/NodeKind';

// Figma "Setting pair" (2362:29472): label + value row inside a helper card. Highlighted = just changed.
// With `onClick` the row is a button that edits that setting in place (2.4b: Tools opens the tool picker).
// Not in Figma: `alert` items of the comma-separated value (a tool the workspace hasn't connected) read amber with a
// lock and are their own buttons (`onAlertClick`: the connect step), so the row keeps one line.
export function SettingPair({
  label,
  value,
  highlighted,
  alert,
  onAlertClick,
  onClick,
}: SettingRow & { onClick?: () => void }) {
  const text =
    'min-h-[15px] text-[9.488px] leading-[14.231px] tracking-[-0.066px]';
  const row = clsx(
    'flex w-full items-center gap-[6.6px] rounded-[4.125px] px-[4.95px] py-[3.3px] text-left',
    highlighted && 'bg-[#fff1b8]'
  );
  const labelClass = clsx(
    text,
    'w-[34.65px] shrink-0 whitespace-nowrap text-muted'
  );
  const valueClass = clsx(
    text,
    'min-w-px flex-1 overflow-clip font-medium text-ink'
  );
  if (alert?.length) {
    const items = value.split(', ');
    // The row's own action is a button behind the text, so each alert item can be a button too (no nesting).
    return (
      <div className={clsx(row, 'relative')}>
        {onClick && (
          <button
            type="button"
            aria-label={`Edit ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="absolute inset-0 rounded-[4.125px] hover:bg-hover"
          />
        )}
        <p className={clsx(labelClass, 'pointer-events-none relative')}>
          {label}
        </p>
        <p className={clsx(valueClass, 'pointer-events-none relative')}>
          {items.map((item, i) => (
            <Fragment key={item}>
              {i > 0 && ', '}
              {alert.includes(item) ? (
                <button
                  type="button"
                  aria-label={`Connect ${item}`}
                  title={`${item} isn't connected`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAlertClick?.(item);
                  }}
                  className="pointer-events-auto inline-flex items-center gap-[2px] align-top whitespace-nowrap text-[#a66600] hover:underline"
                >
                  <img src={lock} alt="" className="size-[7px] shrink-0" />
                  {item}
                </button>
              ) : (
                item
              )}
            </Fragment>
          ))}
        </p>
      </div>
    );
  }
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      aria-label={onClick ? `Edit ${label}` : undefined}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      className={clsx(row, onClick && 'hover:bg-hover')}
    >
      <p className={labelClass}>{label}</p>
      <p className={valueClass}>{value}</p>
    </Tag>
  );
}

/** One row of a helper card's settings well. */
export type SettingRow = {
  label: string;
  value: string;
  highlighted?: boolean;
  /** Items of `value` drawn amber with a lock, e.g. a tool the workspace hasn't connected. */
  alert?: string[];
  onAlertClick?: (item: string) => void;
};

export type HelperCardData = {
  name: AgentName | string;
  /** Helper art over the top-right corner. */
  agent?: AgentName;
  agentState?: AgentState;
  kind?: Exclude<NodeKindName, 'task'>;
  description: string;
  settings: SettingRow[];
  /** "Updated" (blue badge) or "New" (blue badge + dashed border). Dimmed = not involved. */
  state?: 'default' | 'dimmed' | 'updated' | 'new';
  /** The helper being edited (drawer, inline edit): 1.4px ink-2 border. 'accent' = the 2px blue border of a card
   *  whose permission picker is open (2.4e). */
  selected?: boolean | 'accent';
  /** Added to the chat as context: a 2px outline in the connector blue laid over the card edge (no layout space). */
  inChat?: boolean;
  /** Avatar size when an instance overrides it (the Publisher's octopus is 26.06px). Right edge stays put. */
  agentSize?: number;
  /** Avatar left edge when an instance keeps it instead (the Planner's owl art is 29.16px, overflowing right). */
  agentLeft?: number;
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
  selected,
  inChat,
  agentSize = 24.75,
  agentLeft,
  scale,
  onClick,
  onSettingClick,
  className,
  style,
}: HelperCardData & {
  /** Scaled instance (the 2.x plan map draws cards at 0.85 → 154.275px). Uses CSS zoom, so layout scales too. */
  scale?: number;
  onClick?: () => void;
  /** Makes each setting row a button (edit that setting on the card). */
  onSettingClick?: (label: string) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const badge =
    state === 'updated' ? 'Updated' : state === 'new' ? 'New' : null;
  return (
    <div
      data-helper-card
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
        'relative flex w-[181.5px] flex-col items-start rounded-[8.25px] bg-white drop-shadow-[0px_0.825px_0.825px_rgba(16,18,24,0.04)]',
        // Hairline strokes are padding + an inset shadow: Chrome rounds sub-pixel borders up to 1px, which made
        // every 0.85-scale card ~1px taller than Figma's. Dashed (New) needs a real border.
        selected === 'accent'
          ? 'p-0.5 shadow-[inset_0_0_0_2px_var(--color-accent)]'
          : selected
            ? 'p-[1.4px] shadow-[inset_0_0_0_1.4px_var(--color-ink-2)]'
            : state === 'new'
              ? 'border-[0.825px] border-dashed border-line-2'
              : 'p-[0.825px] shadow-[inset_0_0_0_0.825px_var(--color-line-2)]',
        state === 'dimmed' && 'opacity-40',
        inChat && 'outline-2 -outline-offset-1 outline-accent-line',
        onClick && 'cursor-pointer',
        className
      )}
      style={scale ? { zoom: scale, ...style } : style}
    >
      <div className="flex h-[36.3px] w-full shrink-0 items-center gap-[6.6px] pr-[34px] pl-[8.25px] shadow-[inset_0_-0.825px_0_0_var(--color-line)]">
        <NodeKindTile kind={kind} size={18.15} />
        <p className="min-w-px flex-1 text-[11.55px] leading-[17.325px] font-semibold tracking-[-0.1155px] whitespace-nowrap text-ink">
          {name}
        </p>
        {badge ? (
          // Figma rounds the 0.85-scale text box up to 11px, so the line box is 12.94 (badge 13.5px tall on the map).
          <div className="flex shrink-0 items-center justify-center gap-[2.96px] rounded-[4.44px] bg-accent-soft px-[4.44px] py-[1.48px]">
            <p className="text-[8.14px] leading-[12.94px] font-medium whitespace-nowrap text-accent">
              {badge}
            </p>
          </div>
        ) : (
          <div className="h-[14.8px] w-[48.2px] shrink-0" />
        )}
      </div>
      <div className="flex w-full shrink-0 flex-col items-start p-[6.6px]">
        {/* 14px lines: Figma rounds the 13.6px text box up to whole pixels (1 line = 14, 2 = 28). */}
        <p className="w-full px-[1.65px] text-[9.9px] leading-[14px] tracking-[-0.066px] text-muted">
          {description}
        </p>
        <div className="flex w-full flex-col items-start pt-[6.6px]">
          <div className="flex w-full flex-col items-start rounded-[4.95px] bg-well p-[4.125px] shadow-[inset_0_0_0_0.825px_var(--color-line)]">
            {settings.map((s) => (
              <SettingPair
                key={s.label}
                {...s}
                onClick={
                  onSettingClick ? () => onSettingClick(s.label) : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>
      {agent && (
        <AgentAvatar
          agent={agent}
          state={agentState}
          size={agentSize}
          className="absolute! top-[-14.125px]"
          // Figma: 148.5px from the stroke's inner edge, so 149.325 from the card's outer edge.
          style={{ left: agentLeft ?? 174.075 - agentSize }}
        />
      )}
    </div>
  );
}
