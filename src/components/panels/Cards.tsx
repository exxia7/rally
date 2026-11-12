import clsx from 'clsx';
import {
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from 'react';

import checkBadge from '@/assets/icons/check-badge.svg';
import checkWhite from '@/assets/icons/check-white.svg';
import chevronRightDark from '@/assets/icons/chevron-right-dark.svg';
import dragHandle from '@/assets/icons/drag-handle.svg';
import liveDot from '@/assets/icons/live-dot.svg';
import { FORK_COLOR, type ForkNumber } from '@/components/map/forks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TextArea } from '@/components/ui/TextArea';

// Figma "Handoff problem card" (2362:30161): red card showing what a handoff between helpers missed, with its
// source. #fff1f1 fill, 1px problem border, 10px radius, 16px padding. The kind ("Missing") is SemiBold red; the
// context after it is muted Regular in the component (4.1b) and SemiBold red where an instance overrides it
// (`contextTone="problem"`, 4.1 and 4.3). The action is a Ghost Small button with a chevron, `actionTop` px below
// the detail (10 in the component, 12 in 4.3).
export function HandoffProblemCard({
  kind = 'Missing',
  context = "· Didn't reach Strategist",
  contextTone = 'muted',
  title,
  detail,
  action = 'See the full handoff (4 items)',
  actionTop = 10,
  onAction,
  className,
  style,
}: {
  kind?: string;
  context?: string;
  contextTone?: 'muted' | 'problem';
  title: string;
  detail: string;
  action?: string;
  actionTop?: number;
  onAction?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={clsx(
        'flex w-[350px] max-w-full flex-col items-start rounded-[10px] border border-problem bg-[#fff1f1] p-4',
        className
      )}
      style={style}
    >
      <p className="w-full text-[12px] leading-[18px] font-semibold tracking-[-0.08px] text-problem">
        {kind}{' '}
        <span
          className={clsx(contextTone === 'muted' && 'font-normal text-muted')}
        >
          {context}
        </span>
      </p>
      <p className="w-full pt-1.5 text-[16px] leading-[22px] font-semibold tracking-[-0.08px] text-ink">
        {title}
      </p>
      <p className="w-full pt-1.5 text-[13px] leading-[18.75px] tracking-[-0.08px] text-ink-2">
        {detail}
      </p>
      <div className="flex w-full items-center" style={{ paddingTop: actionTop }}>
        <button
          type="button"
          onClick={onAction}
          className="flex h-7 items-center gap-1 rounded-control text-[12px] leading-4 font-medium whitespace-nowrap text-ink hover:text-accent"
        >
          {action}
          <Icon src={chevronRightDark} size={16} />
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
  onDragEnd,
  onClick,
  expanded,
  checked,
  onCheckedChange,
  className,
}: {
  name: string;
  source?: string;
  /** With `onCheckedChange`, the row's box is a real checkbox: unticked it looks as before, ticked it fills
   *  accent with a white check (the solid Checkbox). */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
  /** Tap path for touch screens, where dragging doesn't work (2.6 opens an "Add to…" menu). */
  onClick?: () => void;
  /** With `onClick`: whether the menu it opens is showing. */
  expanded?: boolean;
  className?: string;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-haspopup={onClick ? 'menu' : undefined}
      aria-expanded={onClick ? expanded : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', name);
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart?.(e);
      }}
      onDragEnd={onDragEnd}
      className={clsx(
        'flex h-8 w-full cursor-grab items-center gap-1.5 rounded-control hover:bg-well active:cursor-grabbing',
        className
      )}
    >
      <Icon src={dragHandle} size={14} />
      {onCheckedChange ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={!!checked}
          aria-label={`Select ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onCheckedChange(!checked);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className={clsx(
            'flex size-4 shrink-0 items-center justify-center rounded-[5px] border',
            checked ? 'border-accent bg-accent' : 'border-line-2 bg-white'
          )}
        >
          {checked && <Icon src={checkWhite} size={7.545} />}
        </button>
      ) : (
        <span className="size-4 shrink-0 rounded-[5px] border border-line-2 bg-white" />
      )}
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
// Medium 14/20 quote, then a Secondary Small link button with a chevron. A fork's brief (4.5, 6.5, 6.6) is the
// Working state in the fork's colour: Branch/Fork N dot + eyebrow.
export function OutputPreview({
  eyebrow = 'Writer wrote',
  quote,
  working,
  fork,
  action = 'See all 5 pieces',
  onAction,
  className,
}: {
  eyebrow?: string;
  quote: string;
  working?: boolean;
  fork?: ForkNumber;
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
          (working || fork) && 'gap-1.5'
        )}
      >
        {fork ? (
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: FORK_COLOR[fork] }}
          />
        ) : (
          working && <Icon src={liveDot} size={6} />
        )}
        <p
          className={clsx(
            'text-[12px] leading-[18px] whitespace-nowrap',
            working ? 'text-accent' : 'text-muted'
          )}
          style={fork ? { color: FORK_COLOR[fork] } : undefined}
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
// and Undo. Won't post greys the title and body. Uncontrolled from `initial`, or controlled with `state` (5.1's
// "Approve all" sets every item).
export type ApprovalState = 'waiting' | 'approved' | 'wont-post';

export function ApprovalItem({
  title,
  when,
  body,
  channelNote,
  initial = 'waiting',
  state: stateProp,
  onEdit,
  onBodyChange,
  onChange,
  className,
}: {
  title: string;
  when: string;
  body: string;
  channelNote?: string;
  initial?: ApprovalState;
  state?: ApprovalState;
  /** Edit leaves the card (old behaviour). Without it, Edit edits the text in place: a Text area with Save / Cancel. */
  onEdit?: () => void;
  /** The saved text after an in-place edit. */
  onBodyChange?: (text: string) => void;
  onChange?: (state: ApprovalState) => void;
  className?: string;
}) {
  const [inner, setInner] = useState<ApprovalState>(initial);
  const state = stateProp ?? inner;
  const [text, setText] = useState(body);
  const [draft, setDraft] = useState<string | null>(null);
  const save = () => {
    const t = draft?.trim();
    if (t) {
      setText(t);
      onBodyChange?.(t);
    }
    setDraft(null);
  };
  const set = (s: ApprovalState) => {
    setInner(s);
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
      {/* Figma rounds text boxes up to whole pixels: the title row is 21px, and the body gets ~0.7px below
          its last line (17.188px lines → 18 / 35px boxes). */}
      <div className="flex w-[320px] max-w-full items-center gap-2">
        <p
          className={clsx(
            'min-h-[21px] min-w-px flex-1 text-[14px] leading-[20.25px] font-semibold tracking-[-0.08px] whitespace-nowrap',
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
      {draft !== null ? (
        <div className="w-full pt-1.5">
          <TextArea
            autoFocus
            aria-label={`Edit ${title}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setDraft(null);
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
            }}
            className="h-auto min-h-[96px] resize-y"
          />
        </div>
      ) : (
        <p
          className={clsx(
            'w-[320px] max-w-full pt-1.5 pb-[0.7px] text-[13px] leading-[17.188px] tracking-[-0.08px]',
            off ? 'text-[#a0a3aa]' : 'text-ink-2'
          )}
        >
          {text}
        </p>
      )}
      <div className="flex w-full items-center pt-2.5">
        {draft !== null ? (
          <div className="flex items-start gap-1.5">
            <Button variant="primary" size="sm" onClick={save}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        ) : state === 'waiting' ? (
          <div className="flex w-full items-center justify-between">
            <div className="flex items-start gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => set('approved')}
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit ?? (() => setDraft(text))}
              >
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
