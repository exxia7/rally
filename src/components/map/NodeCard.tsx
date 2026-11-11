import clsx from 'clsx';
import type { CSSProperties, KeyboardEvent } from 'react';

import diamondLg from '@/assets/icons/diamond-lg.svg';
import diamond from '@/assets/icons/diamond.svg';
import liveDot from '@/assets/icons/live-dot.svg';
import lock from '@/assets/icons/lock-amber.svg';
import { Button } from '@/components/ui/Button';

import { type NodeKindName, NodeKindTile } from './NodeKind';

export type NodeState =
  | 'default'
  | 'working'
  | 'waiting'
  | 'needs-you'
  | 'will-rerun'
  | 'updated'
  | 'done';

export type NodeFlag = { label: string; tone?: 'neutral' | 'blue' };

export type NodeStatus = {
  text: string;
  /** live = blue dot + blue text (working), problem = red (hand raised), strong = dark semibold, muted = grey. */
  tone?: 'live' | 'muted' | 'problem' | 'strong';
};

export type NodeCardData = {
  kind: NodeKindName;
  title: string;
  /** Helper running the step, shown as "· Writer" after the kind. */
  agent?: string;
  state?: NodeState;
  /** Badge in the header's Flags slot: "Not sure", "Updated", "Will rerun". */
  flag?: NodeFlag;
  /** "Your OK" permission flag: the step asks the founder first. */
  asksYouFirst?: boolean;
  /** Task brief, medium and dark (Task cards). */
  lead?: string;
  /** Output preview box: small label + text. */
  preview?: { label: string; text: string };
  /** Status / summary line under the header. */
  status?: NodeStatus;
  showRerun?: boolean;
  width?: number;
};

const KIND_LABEL: Record<NodeKindName, string> = {
  task: 'Task',
  action: 'Action',
  decision: 'Decision',
  output: 'Output',
};

const meta =
  'text-[9.223px] leading-[9.223px] tracking-[-0.0738px] whitespace-nowrap text-muted';
// Figma rounds each text box up to whole pixels (a 15.218px line is a 16px box), so lines get min-h.
const line = 'min-h-4 text-[10.145px] leading-[15.218px] tracking-[-0.0738px]';

// Figma "Permission" flag: amber "Your OK" with a lock.
export function YourOkFlag() {
  return (
    <div className="flex shrink-0 items-center justify-center gap-[2.8px] rounded-[4.2px] bg-[#fff4e0] px-[4.2px] py-[1.4px]">
      <img src={lock} alt="" className="size-[7px]" />
      <p className="text-center text-[7.7px] leading-[11.2px] font-medium whitespace-nowrap text-[#a66600]">
        Your OK
      </p>
    </div>
  );
}

function Flag({ label, tone = 'neutral' }: NodeFlag) {
  return tone === 'blue' ? (
    <div className="flex shrink-0 items-center justify-center gap-[2.921px] rounded-[4.381px] bg-accent-soft px-[4.381px] py-[1.46px]">
      <p className="text-[8.033px] leading-[11.684px] font-medium whitespace-nowrap text-accent">
        {label}
      </p>
    </div>
  ) : (
    <div className="flex shrink-0 items-center justify-center gap-1 rounded-[6px] bg-chip px-1.5 py-0.5">
      <p className="text-center text-[8.14px] leading-[11.84px] font-medium whitespace-nowrap text-ink-2">
        {label}
      </p>
    </div>
  );
}

function StatusLine({
  status,
  inset,
}: {
  status: NodeStatus;
  inset?: boolean;
}) {
  const tone = status.tone ?? 'muted';
  if (tone === 'live') {
    return (
      <div className="flex w-full flex-col gap-[5px] overflow-clip">
        <div className="flex w-full items-center gap-[5px]">
          <img src={liveDot} alt="" className="size-1.5 shrink-0" />
          <p className={clsx(line, 'min-w-px flex-1 font-medium text-accent')}>
            {status.text}
          </p>
        </div>
      </div>
    );
  }
  return (
    <p
      className={clsx(
        line,
        'w-full',
        inset && 'px-[1.845px]',
        tone === 'problem' && 'font-medium text-problem',
        tone === 'strong' && 'font-semibold text-ink',
        tone === 'muted' && 'text-muted'
      )}
    >
      {status.text}
    </p>
  );
}

// Figma "Node card" (2362:29543): one step on the run flowchart. Kind comes from the header; State shows
// what's happening (Working, Waiting, Needs you, Will rerun, Updated, Done). 175.2px wide at map scale;
// borders take layout space (Figma: stroke included in layout), so they are CSS borders.
export function NodeCard({
  kind,
  title,
  agent,
  state = 'default',
  flag,
  asksYouFirst,
  lead,
  preview,
  status,
  showRerun,
  width = 175.2,
  onClick,
  onRerun,
  className,
  style,
}: NodeCardData & {
  onClick?: () => void;
  onRerun?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const live = status?.tone === 'live';
  const compact = !lead && !preview && kind !== 'decision';
  const onKey = (e: KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKey}
      className={clsx(
        'flex flex-col justify-center rounded-[9.221px] bg-white drop-shadow-[0px_0.922px_0.922px_rgba(16,18,24,0.04)]',
        state === 'needs-you'
          ? 'border-[1.4px] border-solid border-ink-2'
          : state === 'will-rerun'
            ? 'border-[0.922px] border-dashed border-accent'
            : state === 'working'
              ? 'border-[0.922px] border-solid border-accent-line'
              : 'border-[0.922px] border-solid border-line-2',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ width, ...style }}
    >
      <div
        className={clsx(
          'flex w-full flex-col',
          state === 'waiting' && 'opacity-50'
        )}
      >
        <div
          className={clsx(
            'flex w-full flex-col gap-[3.7px] border-b-[0.922px] border-solid border-line px-[9.221px]',
            kind === 'decision' ? 'h-[64.382px] py-[7.378px]' : 'py-[7.4px]'
          )}
        >
          <div className="flex w-full items-center gap-[3.689px]">
            {kind === 'decision' &&
              (state === 'needs-you' ? (
                <img
                  src={diamondLg}
                  alt=""
                  className="size-[7.378px] shrink-0"
                />
              ) : (
                <img src={diamond} alt="" className="size-[5.03px] shrink-0" />
              ))}
            <p className={meta}>{KIND_LABEL[kind]}</p>
            {agent && <p className={meta}>· {agent}</p>}
            <div className="flex min-h-[14.8px] min-w-px flex-1 items-center justify-end gap-[3.7px] overflow-clip">
              {flag && <Flag {...flag} />}
              {asksYouFirst && <YourOkFlag />}
            </div>
          </div>
          <div className="flex w-full items-center gap-[7.378px] overflow-clip">
            <NodeKindTile
              kind={kind}
              emphasis={kind === 'decision' && state === 'needs-you'}
            />
            <p className="min-w-px flex-1 text-[11.99px] leading-[14.987px] font-semibold tracking-[-0.1199px] text-ink">
              {title}
            </p>
          </div>
        </div>
        {compact ? (
          <div className="flex h-[30.757px] w-full items-center p-[9.221px]">
            {status && <StatusLine status={status} />}
          </div>
        ) : (
          <div
            className={clsx(
              'flex w-full flex-col items-start px-[9.221px] pt-[9.221px]',
              live ? 'gap-2 pb-2.5' : 'gap-[5.534px] pb-[9.221px]'
            )}
          >
            {lead && (
              <p className="w-full px-[1.845px] text-[11.068px] leading-[15.218px] font-medium tracking-[-0.0738px] text-ink">
                {lead}
              </p>
            )}
            {preview && (
              <div className="flex w-full flex-col items-start rounded-[5.534px] border-[0.922px] border-solid border-line bg-well px-[7.378px] py-[5.534px]">
                <p className="min-h-3.5 w-full text-[8.762px] leading-[13.143px] font-medium tracking-[-0.0738px] text-muted">
                  {preview.label}
                </p>
                <p className="w-full pt-[1.845px] text-[10.145px] leading-[13.95px] tracking-[-0.0738px] text-ink">
                  {preview.text}
                </p>
              </div>
            )}
            {status && (
              <StatusLine status={status} inset={kind !== 'decision'} />
            )}
          </div>
        )}
        {showRerun && (
          <div className="flex w-full items-center justify-end overflow-clip px-[9.221px] pb-[9.221px]">
            <Button
              size="sm"
              className="min-w-px flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onRerun?.();
              }}
            >
              Rerun
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
