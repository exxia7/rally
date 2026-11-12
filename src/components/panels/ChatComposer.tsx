import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';

import arrowRightDark from '@/assets/icons/arrow-right-dark.svg';
import plusAttach from '@/assets/icons/plus-attach.svg';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Suggestion } from '@/components/ui/Suggestion';
import { TextInput } from '@/components/ui/TextInput';
import { useOutsideClick } from '@/lib/useOutsideClick';

import type { Effort, ModelId } from '@/state/types';

import { ATTACH_LABEL, AttachMenu, AttachmentChips } from './AttachMenu';
import { EffortPicker, ModelPicker } from './ModelEffortPicker';

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
// Clicking a suggestion sends it. `defaultText` opens it prefilled and focused, caret at the end (a decision's
// "Change" starts "Change: <decision> → ").
export function ChatComposer({
  onSend,
  suggestions,
  placeholder = 'Ask for changes…',
  narrow,
  className,
  defaultText,
  attachable,
  model,
  onModelChange,
}: {
  defaultText?: string;
  onSend: (text: string) => void;
  suggestions?: string[];
  placeholder?: string;
  /** 12px sides, for a narrow (300px) chat column (2.4c), as the Figma component description says. */
  narrow?: boolean;
  className?: string;
  /**
   * Tools row (not in Figma, design/non-figma-ui.md): `attachable` adds a ghost "+" that opens the attach menu
   * (above it) and `onModelChange` a model picker. With either, the box gets a second row under the field:
   * + and model on the left, send on the right. Attachments show as chips above the field and are sent with the
   * message ("… · Attached: Brand guide.pdf").
   */
  attachable?: boolean;
  model?: ModelId;
  onModelChange?: (model: ModelId) => void;
}) {
  const [attachments, setAttachments] = useState<string[]>([]);
  const sendWith = (t: string) => {
    const withFiles = attachments.length
      ? `${t} · Attached: ${attachments.join(', ')}`
      : t;
    setAttachments([]);
    onSend(withFiles);
  };
  const { text, setText, send } = useComposer(sendWith, defaultText);
  const [attachOpen, setAttachOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const closeAttach = useCallback(() => setAttachOpen(false), []);
  useOutsideClick([anchor], attachOpen, closeAttach);
  const fileInput = useRef<HTMLInputElement>(null);
  const tools = attachable || !!onModelChange;
  // Attachments alone can be sent too.
  const sendAny = () =>
    !text.trim() && attachments.length ? sendWith('Here you go') : send();

  const field = (
    <TextInput
      appearance="borderless"
      className="h-[30px] flex-1"
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
          sendAny();
        }
      }}
    />
  );
  const sendButton = (
    <button
      type="button"
      aria-label="Send"
      onClick={sendAny}
      className="flex size-8 shrink-0 items-center justify-center rounded-control hover:bg-hover"
    >
      <Icon src={arrowRightDark} size={16} />
    </button>
  );
  return (
    <div
      className={clsx(
        'flex w-full shrink-0 flex-col items-start gap-3 border-t border-line bg-white pt-3 pb-4 max-md:px-3',
        narrow ? 'px-3' : 'px-6',
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
      {tools ? (
        <div className="flex w-full flex-col gap-1 rounded-control border border-control-border bg-white p-1 pl-3 focus-within:border-accent-line">
          <AttachmentChips
            items={attachments}
            onRemove={(i) => setAttachments((a) => a.filter((_, k) => k !== i))}
            className="pt-1.5 pr-2"
          />
          <div className="flex w-full items-center">{field}</div>
          <div className="-ml-2 flex w-[calc(100%+8px)] items-center gap-1">
            {attachable && (
              <div ref={anchor} className="relative flex shrink-0">
                <button
                  type="button"
                  aria-label="Attach"
                  aria-haspopup="menu"
                  aria-expanded={attachOpen}
                  onClick={() => setAttachOpen((o) => !o)}
                  className={clsx(
                    'flex size-8 shrink-0 items-center justify-center rounded-control',
                    attachOpen ? 'bg-hover' : 'hover:bg-hover'
                  )}
                >
                  <Icon src={plusAttach} size={16} />
                </button>
                {attachOpen && (
                  <AttachMenu
                    onClose={closeAttach}
                    onPick={(kind) =>
                      kind === 'upload'
                        ? fileInput.current?.click()
                        : setAttachments((a) => [...a, ATTACH_LABEL[kind]])
                    }
                    className="absolute bottom-10 left-0 w-[263px]"
                  />
                )}
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    const names = [...(e.target.files ?? [])].map(
                      (f) => f.name
                    );
                    setAttachments((a) => [...a, ...names]);
                    e.target.value = '';
                  }}
                />
              </div>
            )}
            {onModelChange && (
              <ModelPicker
                value={model}
                onChange={onModelChange}
                placement="above"
              />
            )}
            <div className="flex-1" />
            {sendButton}
          </div>
        </div>
      ) : (
        <div className="flex w-full items-center gap-1 overflow-clip rounded-control border border-control-border bg-white py-1 pr-1 pl-3 focus-within:border-accent-line">
          {field}
          {sendButton}
        </div>
      )}
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
  model,
  onModelChange,
  effort,
  onEffortChange,
  className,
}: {
  onSend: (text: string) => void;
  placeholder?: string;
  /** Optional model / effort pickers beside the attach button (each shows when its onChange is passed). */
  model?: ModelId;
  onModelChange?: (model: ModelId) => void;
  effort?: Effort;
  onEffortChange?: (effort: Effort) => void;
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
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
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
          {onModelChange && (
            <ModelPicker value={model} onChange={onModelChange} />
          )}
          {onEffortChange && (
            <EffortPicker value={effort} onChange={onEffortChange} />
          )}
        </div>
        <Button variant="primary" onClick={send}>
          Send
        </Button>
      </div>
    </div>
  );
}
