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
function useComposer(onSend: (text: string) => void, initial = '') {
  const [text, setText] = useState(initial);
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
// Send with nothing typed does what 2.1's brief composer does: focuses the field and swaps the placeholder for
// `emptyPlaceholder` until you type.
export function PlanComposer({
  onSend,
  placeholder = 'Add goals or channels (optional)',
  emptyPlaceholder = 'Type a goal or a channel first.',
  attachOpen,
  onAttachOpenChange,
  onAttach,
  className,
}: {
  onSend: (text: string) => void;
  placeholder?: string;
  /** The placeholder after Send with nothing typed. */
  emptyPlaceholder?: string;
  attachOpen: boolean;
  onAttachOpenChange: (open: boolean) => void;
  onAttach?: (kind: 'upload' | 'link' | 'skill') => void;
  className?: string;
}) {
  const { text, setText, send: sendText } = useComposer(onSend);
  const anchor = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [nudge, setNudge] = useState(false);
  // Any text ends the nudge.
  if (nudge && text.trim()) setNudge(false);
  const send = () => {
    if (text.trim()) sendText();
    else {
      setNudge(true);
      box.current?.querySelector('input')?.focus();
    }
  };
  const close = useCallback(
    () => onAttachOpenChange(false),
    [onAttachOpenChange]
  );
  useOutsideClick([anchor], attachOpen, close);
  return (
    <div
      ref={box}
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
        placeholder={nudge ? emptyPlaceholder : placeholder}
        aria-label={placeholder}
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
// 8px radius, 12px left / 4px other padding) with a borderless message field (30px for one line, growing with what
// you type up to 5 lines, then scrolling; Shift+Enter is a new line) and a ghost send icon button, which stays on
// the last line. Under 768px the sides are 16px, the panel's phone inset. Clicking a suggestion sends it. `defaultText` opens it prefilled and focused, caret at the end (a decision's
// "Change" starts "Change: <decision> → ").
export function ChatComposer({
  onSend,
  suggestions,
  placeholder = 'Ask for changes…',
  narrow,
  className,
  defaultText,
}: {
  defaultText?: string;
  onSend: (text: string) => void;
  suggestions?: string[];
  placeholder?: string;
  /** 12px sides, for a narrow (300px) chat column (2.4c), as the Figma component description says. */
  narrow?: boolean;
  className?: string;
}) {
  const { text, setText, send } = useComposer(onSend, defaultText);
  return (
    <div
      className={clsx(
        'flex w-full shrink-0 flex-col items-start gap-3 border-t border-line bg-white pt-3 pb-4',
        narrow ? 'px-3' : 'px-6 max-md:px-4',
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
      <div className="flex w-full items-end gap-1 overflow-clip rounded-control border border-control-border bg-white py-1 pr-1 pl-3 focus-within:border-accent-line">
        <textarea
          rows={1}
          aria-label={placeholder}
          className="field-sizing-content block max-h-[102px] min-h-[30px] min-w-px flex-1 resize-none bg-transparent py-1.5 text-[13px] leading-[18px] tracking-[-0.08px] text-ink outline-none placeholder:text-[rgba(29,30,34,0.5)]"
          placeholder={placeholder}
          autoFocus={!!defaultText}
          onFocus={
            defaultText
              ? (e) => {
                  const n = e.currentTarget.value.length;
                  e.currentTarget.setSelectionRange(n, n);
                }
              : undefined
          }
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
// Enter sends (Shift+Enter is a new line). The attach menu opens 21px under the attach button. Send stays enabled
// (as Figma draws it): with an empty brief it focuses the field and swaps the placeholder for `emptyPlaceholder`
// until there's text again.
export function BriefComposer({
  onSend,
  placeholder = 'What are you launching, who is it for, and when?',
  emptyPlaceholder = 'Write your launch brief first.',
  value,
  onValueChange,
  attachOpen,
  onAttachOpenChange,
  onAttach,
  className,
}: {
  onSend: (text: string) => void;
  placeholder?: string;
  /** The placeholder after Send with an empty brief. */
  emptyPlaceholder?: string;
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
  const field = useRef<HTMLTextAreaElement>(null);
  const [nudge, setNudge] = useState(false);
  // Any text (typed or a starter chip) ends the nudge.
  if (nudge && value.trim()) setNudge(false);
  const send = () => {
    const t = value.trim();
    if (t) onSend(t);
    else {
      setNudge(true);
      field.current?.focus();
    }
  };
  return (
    <div
      className={clsx(
        'flex w-full flex-col items-end gap-2 rounded-card border border-line-2 bg-white p-3 drop-shadow-[0px_1px_1px_rgba(16,18,24,0.04)]',
        className
      )}
    >
      <textarea
        ref={field}
        aria-label="Launch brief"
        value={value}
        placeholder={nudge ? emptyPlaceholder : placeholder}
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
