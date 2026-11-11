import clsx from 'clsx';
import type { ReactNode } from 'react';

import { PathfinderAvatar } from '@/components/ui/Avatar';

// Chat messages from the plan chat (frame 2.2, 2362:23566). Assistant: 30px Pathfinder avatar, 12px gap, then a
// white bubble (1px line border, 16/12 padding, 6px top-left corner, 10px elsewhere, max 420px, 13/21.125 text).
// The user: a well bubble aligned right (16/10 padding, 6px top-right corner, max 400px, 13/19.5 text).
// Figma rounds text boxes up to whole pixels (2 lines of 21.125 → 43), so the bottom padding carries the
// difference (+0.75 / +0.5) to keep the column from drifting up. Text keeps explicit line breaks ("\n"), as the Figma text boxes do. `children` render under the bubble,
// aligned with it (e.g. a "See your team" button).
export function AssistantMessage({
  text,
  children,
}: {
  text: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-4">
      <div className="flex w-full items-start gap-3">
        <PathfinderAvatar />
        <div className="flex max-w-[420px] min-w-0 flex-col items-start rounded-tl-[6px] rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px] border border-line bg-white px-4 pt-3 pb-[12.75px]">
          <p className="text-[13px] leading-[21.125px] tracking-[-0.08px] whitespace-pre-line text-ink">
            {text}
          </p>
        </div>
      </div>
      {children && (
        <div className="flex w-full flex-col items-start pl-[42px]">
          {children}
        </div>
      )}
    </div>
  );
}

export function UserMessage({
  text,
  wrap,
  className,
}: {
  text: ReactNode;
  /** Let long messages wrap at every width (the side panel's run chat); plan chat keeps one line on desktop. */
  wrap?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex max-w-[400px] shrink-0 flex-col items-start rounded-tl-[10px] rounded-tr-[6px] rounded-br-[10px] rounded-bl-[10px] border border-line bg-well px-4 pt-2.5 pb-[10.5px] max-md:max-w-[85%]',
        className
      )}
    >
      <p
        className={clsx(
          'text-[13px] leading-[19.5px] tracking-[-0.08px] text-ink',
          !wrap && 'md:whitespace-nowrap'
        )}
      >
        {text}
      </p>
    </div>
  );
}

// The message column: 620px max, 32px top / 16px bottom padding, 16px between messages, user messages right.
export function ChatThread({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex w-[620px] max-w-full flex-col items-end gap-4 pt-8 pb-4 max-md:px-4',
        className
      )}
    >
      {children}
    </div>
  );
}

// Side-panel chat (Chat tab in the plan side panel, e.g. 2362:23715). Smaller than the main-column chat:
// 26px Pathfinder avatar 8px from a flexible bubble (1px line border, 12/10 padding, 5px top-left corner,
// 12.5/20.313 text). `children` sit inside the bubble, 8px under the text (the Undo button in 2.4d).
// Figma rounds the text box up to whole pixels; the 10.4px bottom padding splits that difference.
export function PanelAssistantMessage({
  text,
  children,
}: {
  text: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 items-start gap-2">
      <PathfinderAvatar size={26} />
      <div className="flex min-w-px flex-1 flex-col items-start rounded-tl-[5px] rounded-tr-[10px] rounded-br-[10px] rounded-bl-[10px] border border-line px-3 pt-2.5 pb-[10.4px]">
        <p className="relative top-[0.75px] w-full text-[12.5px] leading-[20.313px] tracking-[-0.08px] text-ink">
          {text}
        </p>
        {children && (
          <div className="flex w-full flex-col items-start pt-2">{children}</div>
        )}
      </div>
    </div>
  );
}

// The user's side-panel message: right-aligned well bubble, no border, max 280px, 12/8 padding, 5px top-right
// corner, 12.5/18.75 text.
export function PanelUserMessage({ text }: { text: ReactNode }) {
  return (
    <div className="flex w-full shrink-0 items-start justify-end overflow-clip">
      <div className="flex max-w-[280px] flex-col items-start rounded-tl-[10px] rounded-tr-[5px] rounded-br-[10px] rounded-bl-[10px] bg-well px-3 pt-2 pb-[8.5px]">
        <p className="relative top-[0.75px] w-full text-[12.5px] leading-[18.75px] tracking-[-0.08px] text-ink">
          {text}
        </p>
      </div>
    </div>
  );
}

// The side-panel message column: 24px sides, 8px top / 16px bottom, 12px between messages.
export function PanelThread({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex w-full flex-col items-start gap-3 px-6 pt-2 pb-4 max-md:px-4',
        className
      )}
    >
      {children}
    </div>
  );
}
