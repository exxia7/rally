import email from '@/assets/icons/email.svg';
import page from '@/assets/icons/page.svg';
import post from '@/assets/icons/post.svg';

// Output type icons (Figma Icon / Page, Post, Email): 16px muted strokes. The Tasks list's "Goes out" rows.
export type OutputType = 'page' | 'post' | 'email';
const TYPE_ICON: Record<OutputType, string> = { page, post, email };

export type OutputItem = {
  id: string;
  label: string;
  type: OutputType;
  isNew?: boolean;
};

export function OutputIcon({ type }: { type: OutputType }) {
  return (
    <img
      src={TYPE_ICON[type]}
      alt=""
      width={16}
      height={16}
      className="size-4 shrink-0"
    />
  );
}

/** Where an output is in the run: before the approval it waits; at the approval it needs your OK, is ready (you
 *  approved it) or won't post; once launched it posted or didn't. */
export type OutputStatus =
  | 'waiting'
  | 'approval'
  | 'ready'
  | 'not-posting'
  | 'posted'
  | 'not-posted';

const STATUS_TEXT: Record<OutputStatus, string> = {
  waiting: 'Waiting',
  approval: 'Needs your OK',
  ready: 'Ready',
  'not-posting': 'Not posting',
  posted: 'Posted',
  'not-posted': 'Not posted',
};

// Drawn like the task statuses (TaskRow): "Needs your OK" is a badge, the rest a muted word.
export function OutputStatusText({ status }: { status: OutputStatus }) {
  return status === 'approval' ? (
    <span className="flex shrink-0 items-center justify-center rounded-[6px] bg-well px-1.5 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap text-ink-2">
      {STATUS_TEXT[status]}
    </span>
  ) : (
    <span className="shrink-0 text-[12px] leading-[18px] whitespace-nowrap text-muted">
      {STATUS_TEXT[status]}
    </span>
  );
}
