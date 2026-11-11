import clsx from 'clsx';
import { useState, type DragEvent, type ReactNode } from 'react';

import checkBadge from '@/assets/icons/check-badge.svg';
import chevronRightDark from '@/assets/icons/chevron-right-dark.svg';
import dragHandle from '@/assets/icons/drag-handle.svg';
import liveDot from '@/assets/icons/live-dot.svg';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

// Figma "Handoff problem card" (2362:30161): red card showing what a handoff between helpers missed, with its
// source. #fff1f1 fill, 1px problem border, 10px radius, 16px padding.
export function HandoffProblemCard({
  kind = 'Missing',
  context = "· Didn't reach Strategist",
  title,
  detail,
  action = 'See the full handoff (4 items) ›',
  onAction,
  className,
}: {
  kind?: string;
  context?: string;
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex w-[350px] max-w-full flex-col items-start rounded-[10px] border border-problem bg-[#fff1f1] p-4',
        className
      )}
    >
      <p className="w-full text-[12px] leading-[18px] tracking-[-0.08px]">
        <span className="font-semibold text-problem">{kind}</span>{' '}
        <span className="text-muted">{context}</span>
      </p>
      <p className="w-full pt-1.5 text-[16px] leading-[22px] font-semibold tracking-[-0.08px] text-ink">
        {title}
      </p>
      <p className="w-full pt-1.5 text-[13px] leading-[18.75px] tracking-[-0.08px] text-ink-2">
        {detail}
      </p>
      <div className="flex w-full items-center pt-2.5">
        <button
          type="button"
          onClick={onAction}
          className="flex h-7 items-center rounded-control text-[12px] leading-4 font-medium whitespace-nowrap text-ink hover:text-accent"
        >
          {action}
        </button>
      </div>
    </div>
  );
}

// Figma "Resource row" (2362:30153): a file, skill or tool in the Sandbox panel. 32px; drag handle, 16px
// checkbox-like square, 12/18 name (ellipsis), 11/16.5 muted source. Draggable (drag a resource onto a helper).
export function ResourceRow({
  name,
  source = 'Built in',
  onDragStart,
  className,
}: {
  name: string;
  source?: string;
  onDragStart?: (e: DragEvent) => void;
  className?: string;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', name);
        onDragStart?.(e);
      }}
      className={clsx(
        'flex h-8 w-full cursor-grab items-center gap-1.5 rounded-control hover:bg-well active:cursor-grabbing',
        className
      )}
    >
      <Icon src={dragHandle} size={14} />
      <span className="size-4 shrink-0 rounded-[5px] border border-line-2 bg-white" />
      <p className="h-[18px] min-w-px flex-1 truncate text-[12px] leading-[18px] tracking-[-0.08px] text-ink">
        {name}
      </p>
      <p className="text-right text-[11px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
        {source}
      </p>
    </div>
  );
}

// Figma "Output preview" (2362:30375): a helper's output at the top of the inspector. White, 1px line border,
// 10px radius, 16px padding, 4px gaps. Done: muted eyebrow; Working: blue live dot + blue eyebrow.
// Medium 14/20 quote, then a Secondary Small link button with a chevron.
export function OutputPreview({
  eyebrow = 'Writer wrote',
  quote,
  working,
  action = 'See all 5 pieces',
  onAction,
  className,
}: {
  eyebrow?: string;
  quote: string;
  working?: boolean;
  action?: string | null;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex w-[350px] max-w-full flex-col items-start gap-1 rounded-[10px] border border-line bg-white p-4',
        className
      )}
    >
      <div
        className={clsx(
          'flex w-full items-center overflow-clip',
          working && 'gap-1.5'
        )}
      >
        {working && <Icon src={liveDot} size={6} />}
        <p
          className={clsx(
            'text-[12px] leading-[18px] whitespace-nowrap',
            working ? 'text-accent' : 'text-muted'
          )}
        >
          {eyebrow}
        </p>
      </div>
      <p className="w-full text-[14px] leading-5 font-medium text-ink">
        {quote}
      </p>
      {action && (
        <div className="flex w-full items-start overflow-clip pt-2">
          <Button
            variant="secondary"
            size="sm"
            trailing={<Icon src={chevronRightDark} size={16} />}
            onClick={onAction}
          >
            {action}
          </Button>
        </div>
      )}
    </div>
  );
}

// Figma "Approval item" (2362:30389): one thing waiting for your OK before it goes out. 1px line border, 10px
// radius, 14px padding. Waiting: Approve (Secondary) + Edit (Ghost) left, Don't post (Ghost, muted) right.
// After a choice the actions collapse to a status badge (Approved green with check / Won't post neutral)
// and Undo. Won't post greys the title and body.
export type ApprovalState = 'waiting' | 'approved' | 'wont-post';

export function ApprovalItem({
  title,
  when,
  body,
  channelNote,
  initial = 'waiting',
  onEdit,
  onChange,
  className,
}: {
  title: string;
  when: string;
  body: string;
  channelNote?: string;
  initial?: ApprovalState;
  onEdit?: () => void;
  onChange?: (state: ApprovalState) => void;
  className?: string;
}) {
  const [state, setState] = useState<ApprovalState>(initial);
  const set = (s: ApprovalState) => {
    setState(s);
    onChange?.(s);
  };
  const off = state === 'wont-post';
  return (
    <div
      className={clsx(
        'flex flex-col items-start rounded-[10px] border border-line p-3.5',
        className
      )}
    >
      <div className="flex w-[320px] max-w-full items-center gap-2">
        <p
          className={clsx(
            'min-w-px flex-1 text-[14px] leading-[20.25px] font-semibold tracking-[-0.08px] whitespace-nowrap',
            off ? 'text-muted-2' : 'text-ink'
          )}
        >
          {title}
        </p>
        <p className="text-[11px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
          {when}
        </p>
      </div>
      {channelNote && (
        <div className="flex w-full items-center gap-2 pt-1.5">
          <Badge tone="blue">Sends for real</Badge>
          <p className="text-[11px] leading-[16.5px] tracking-[-0.08px] whitespace-nowrap text-muted">
            {channelNote}
          </p>
        </div>
      )}
      <p
        className={clsx(
          'w-[320px] max-w-full pt-1.5 text-[13px] leading-[17.188px] tracking-[-0.08px]',
          off ? 'text-[#a0a3aa]' : 'text-ink-2'
        )}
      >
        {body}
      </p>
      <div className="flex w-full items-center pt-2.5">
        {state === 'waiting' ? (
          <div className="flex w-full items-center justify-between">
            <div className="flex items-start gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => set('approved')}
              >
                Approve
              </Button>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                Edit
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-2"
              onClick={() => set('wont-post')}
            >
              Don&apos;t post
            </Button>
          </div>
        ) : (
          <div className="flex w-full items-center gap-1.5">
            {state === 'approved' ? (
              <Badge tone="green" icon={<Icon src={checkBadge} size={10} />}>
                Approved
              </Badge>
            ) : (
              <Badge tone="neutral">Won&apos;t post</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => set('waiting')}>
              Undo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Section wrapper for a list of panel cards with an optional heading (used in inspector bodies).
export function CardStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex w-full flex-col items-start gap-3', className)}>
      {children}
    </div>
  );
}
