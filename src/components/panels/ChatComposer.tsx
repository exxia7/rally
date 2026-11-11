import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';

import arrowRightDark from '@/assets/icons/arrow-right-dark.svg';
import plusAttach from '@/assets/icons/plus-attach.svg';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Suggestion } from '@/components/ui/Suggestion';
import { TextInput } from '@/components/ui/TextInput';
import { useOutsideClick } from '@/lib/useOutsideClick';

import { AttachMenu } from './AttachMenu';

// Shared composer state: a controlled text value, Enter (without Shift) or the send button sends trimmed text.
function useComposer(onSend: (text: string) => void) {
  const [text, setText] = useState('');
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };
  return { text, setText, send };
}

// The main-column composer of the plan chat (frame 2.2, 2362:23586): a white box (1px line-2 border in layout,
// 10px radius, 6px padding, 8px gaps, faint shadow) holding the attach button, a borderless Text Input and a
// Primary "Send". The attach button is a ghost 32px square; while its menu is open it is Outlined.
// The attach menu opens 8px above the button (Figma: menu bottom 808, button top 816), left-aligned with it.
export function PlanComposer({
  onSend,
  placeholder = 'Add goals or channels (optional)',
  attachOpen,
  onAttachOpenChange,
  onAttach,
  className,
}: {
  onSend: (text: string) => void;
  placeholder?: string;
  attachOpen: boolean;
  onAttachOpenChange: (open: boolean) => void;
  onAttach?: (kind: 'upload' | 'link' | 'skill') => void;
  className?: string;
}) {
  const { text, setText, send } = useComposer(onSend);
  const anchor = useRef<HTMLDivElement>(null);
  const close = useCallback(
    () => onAttachOpenChange(false),
    [onAttachOpenChange]
  );
  useOutsideClick([anchor], attachOpen, close);
  return (
    <div
      className={clsx(
        'flex w-full items-center gap-2 rounded-[10px] border border-line-2 bg-white p-1.5 drop-shadow-[0px_1px_1px_rgba(16,18,24,0.04)]',
        className
      )}
    >
      <div ref={anchor} className="relative flex shrink-0">
        <button
          type="button"
          aria-label="Attach"
          aria-haspopup="menu"
          aria-expanded={attachOpen}
          onClick={() => onAttachOpenChange(!attachOpen)}
          className={clsx(
            'flex size-8 shrink-0 items-center justify-center rounded-control',
            attachOpen ? 'border border-line-2 bg-white' : 'hover:bg-hover'
          )}
        >
          <Icon src={plusAttach} size={16} />
        </button>
        {attachOpen && (
          <AttachMenu
            onClose={close}
            onPick={onAttach}
            className="absolute bottom-[40px] left-0 w-[263px]"
          />
        )}
      </div>
      <TextInput
        appearance="borderless"
        className="flex-1"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <Button variant="primary" onClick={send}>
        Send
      </Button>
    </div>
  );
}

// Figma "Chat composer" (2362:28991): pinned to the bottom of the side panel's Chat tab. 1px top line,
// 24px sides, 12px top / 16px bottom, optional Suggestions (6px apart), then one outlined box (control border,
// 8px radius, 12px left / 4px other padding) with a borderless 30px message field and a ghost send icon button.
// Clicking a suggestion sends it.
export function ChatComposer({
  onSend,
  suggestions,
  placeholder = 'Ask for changes…',
  className,
}: {
  onSend: (text: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}) {
  const { text, setText, send } = useComposer(onSend);
  return (
    <div
      className={clsx(
        'flex w-full shrink-0 flex-col items-start gap-3 border-t border-line bg-white px-6 pt-3 pb-4 max-md:px-3',
        className
      )}
    >
      {suggestions && suggestions.length > 0 && (
        <div className="flex w-full flex-col items-start gap-1.5 overflow-clip">
          {suggestions.map((s) => (
            <Suggestion key={s} label={s} onClick={() => onSend(s)} />
          ))}
        </div>
      )}
      <div className="flex w-full items-center gap-1 overflow-clip rounded-control border border-control-border bg-white py-1 pr-1 pl-3 focus-within:border-accent-line">
        <TextInput
          appearance="borderless"
          className="h-[30px] flex-1"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          type="button"
          aria-label="Send"
          onClick={send}
          className="flex size-8 shrink-0 items-center justify-center rounded-control hover:bg-hover"
        >
          <Icon src={arrowRightDark} size={16} />
        </button>
      </div>
    </div>
  );
}

// The launch-brief composer of 2.1 "Planning · empty" ("Launch description", 2362:23524): 620px white box (1px
// line-2 border in layout, 12px radius, 12px padding, 8px gap, faint shadow). A 44px multi-line field (14px,
// placeholder ink at 50%), then the actions row: an Outlined 32px attach button and the Primary "Send".
// Enter sends (Shift+Enter is a new line). The attach menu opens 21px under the attach button.
export function BriefComposer({
  onSend,
  placeholder = 'What are you launching, who is it for, and when?',
  value,
  onValueChange,
  attachOpen,
  onAttachOpenChange,
  onAttach,
  className,
}: {
  onSend: (text: string) => void;
  placeholder?: string;
  /** Controlled text (a starter chip fills it). */
  value: string;
  onValueChange: (text: string) => void;
  attachOpen: boolean;
  onAttachOpenChange: (open: boolean) => void;
  onAttach?: (kind: 'upload' | 'link' | 'skill') => void;
  className?: string;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const close = useCallback(
    () => onAttachOpenChange(false),
    [onAttachOpenChange]
  );
  useOutsideClick([anchor], attachOpen, close);
  const send = () => {
    const t = value.trim();
    if (t) onSend(t);
  };
  return (
    <div
      className={clsx(
        'flex w-full flex-col items-end gap-2 rounded-card border border-line-2 bg-white p-3 drop-shadow-[0px_1px_1px_rgba(16,18,24,0.04)]',
        className
      )}
    >
      <textarea
        aria-label="Launch brief"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        className="block h-11 w-full resize-none bg-transparent p-0 text-[14px] leading-[normal] tracking-[-0.08px] text-ink outline-none placeholder:text-[rgba(29,30,34,0.5)]"
      />
      <div className="flex w-full items-center justify-between">
        <div ref={anchor} className="relative flex shrink-0">
          <button
            type="button"
            aria-label="Attach"
            aria-haspopup="menu"
            aria-expanded={attachOpen}
            onClick={() => onAttachOpenChange(!attachOpen)}
            className="flex size-8 shrink-0 items-center justify-center rounded-control border border-line-2 bg-white hover:bg-hover"
          >
            <Icon src={plusAttach} size={16} />
          </button>
          {attachOpen && (
            <AttachMenu
              onClose={close}
              onPick={onAttach}
              className="absolute top-[53px] left-0 w-[263px]"
            />
          )}
        </div>
        <Button variant="primary" onClick={send}>
          Send
        </Button>
      </div>
    </div>
  );
}
