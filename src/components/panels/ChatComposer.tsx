import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';

import arrowRightDark from '@/assets/icons/arrow-right-dark.svg';
import linkIcon from '@/assets/icons/link.svg';
import sparkIcon from '@/assets/icons/pathfinder-spark.svg';
import plusAttach from '@/assets/icons/plus-attach.svg';
import uploadIcon from '@/assets/icons/upload.svg';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Suggestion } from '@/components/ui/Suggestion';
import { TextInput } from '@/components/ui/TextInput';
import { useOutsideClick } from '@/lib/useOutsideClick';

import { AgentArt } from '@/components/agents/AgentAvatar';
import { NodeKindTile } from '@/components/map/NodeKind';
import {
  type ChatChip,
  chatContext,
  type Mentionable,
  useChatChips,
} from '@/state/chatContext';
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
  attachable,
  model,
  onModelChange,
  mentions,
}: {
  defaultText?: string;
  /** `about`: helpers the message was sent to (their chips); the screen lets the first one reply. */
  onSend: (text: string, meta?: { about: string[] }) => void;
  suggestions?: string[];
  placeholder?: string;
  /** 12px sides, for a narrow (300px) chat column (2.4c), as the Figma component description says. */
  narrow?: boolean;
  className?: string;
  /**
   * Tools row (not in Figma, design/non-figma-ui.md): `attachable` adds a ghost "+" that opens the attach menu
   * (above it) and `onModelChange` a model picker. With either, the box gets a second row under the field:
   * + and model on the left, send on the right. Context chips (files, links, skills from +, and map blocks clicked
   * while the chat is open, see state/chatContext) sit above the field and go out with the message.
   */
  attachable?: boolean;
  model?: ModelId;
  onModelChange?: (model: ModelId) => void;
  /** Typing @ lists these helpers above the field; picking one inserts "@Name ". */
  mentions?: Mentionable[];
}) {
  const chips = useChatChips();
  const sendWith = (t: string) => {
    const helpers = chips.filter((c) => c.helper);
    const files = chips.filter((c) => !c.helper);
    let out = t;
    if (helpers.length)
      out += ` · About: ${helpers.map((c) => c.label).join(', ')}`;
    if (files.length)
      out += ` · Attached: ${files.map((c) => c.label).join(', ')}`;
    chatContext.clear();
    onSend(out, { about: helpers.map((c) => c.helper!) });
  };
  const { text, setText, send } = useComposer(sendWith, defaultText);
  const [attachOpen, setAttachOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const closeAttach = useCallback(() => setAttachOpen(false), []);
  useOutsideClick([anchor], attachOpen, closeAttach);
  const fileInput = useRef<HTMLInputElement>(null);
  const tools = attachable || !!onModelChange;
  const chipsShown = tools ? chips : [];
  // Attachments alone can be sent too.
  const sendAny = () =>
    !text.trim() && chipsShown.length ? sendWith('Here you go') : send();
  const addFile = (label: string, attach: 'upload' | 'link' | 'skill') =>
    chatContext.add({ key: `file:${label}:${Date.now()}`, label, attach });

  // @ mentions: an "@word" right before the end of the text opens the list, filtered by the word.
  const at = mentions ? /(?:^|\s)@([^\s@]*)$/.exec(text) : null;
  const matches =
    at && mentions
      ? mentions.filter((m) =>
          m.name.toLowerCase().startsWith(at[1].toLowerCase())
        )
      : [];
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const mentionOpen = matches.length > 0 && dismissed !== text;
  const pick = (m: Mentionable) => {
    setText(text.replace(/@[^\s@]*$/, `@${m.name} `));
    setActive(0);
  };

  const field = (
    // Grows with what you type, up to 5 lines (main's chat field), then scrolls.
    <textarea
      rows={1}
      aria-label={placeholder}
      className="field-sizing-content block max-h-[102px] min-h-[30px] min-w-px flex-1 resize-none bg-transparent py-1.5 text-[13px] leading-[18px] tracking-[-0.08px] text-ink outline-none placeholder:text-[rgba(29,30,34,0.5)]"
      placeholder={placeholder}
      autoFocus={!!defaultText}
      aria-autocomplete={mentions ? 'list' : undefined}
      aria-expanded={mentions ? mentionOpen : undefined}
      onFocus={
        defaultText
          ? (e) => {
              const n = e.currentTarget.value.length;
              e.currentTarget.setSelectionRange(n, n);
            }
          : undefined
      }
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        setActive(0);
      }}
      onKeyDown={(e) => {
        if (mentionOpen) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const d = e.key === 'ArrowDown' ? 1 : -1;
            setActive((i) => (i + d + matches.length) % matches.length);
            return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            pick(matches[Math.min(active, matches.length - 1)]);
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setDismissed(text);
            return;
          }
        }
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
  const mentionList = mentionOpen && (
    <div
      role="listbox"
      aria-label="Mention a helper"
      className="absolute right-0 bottom-[calc(100%+6px)] left-0 z-30 flex max-h-[260px] flex-col gap-0.5 overflow-y-auto rounded-card border border-line-2 bg-white p-1.5 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)]"
    >
      <p className="px-2.5 pt-1 pb-1 text-[11px] leading-4 text-muted">
        Ask a helper
      </p>
      {matches.map((m, i) => (
        <button
          key={m.id}
          type="button"
          role="option"
          aria-selected={i === active}
          onMouseEnter={() => setActive(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pick(m)}
          className={clsx(
            'flex w-full shrink-0 items-center gap-2.5 rounded-control px-2.5 py-1.5 text-left',
            i === active && 'bg-well'
          )}
        >
          {m.agent ? (
            <AgentArt agent={m.agent} size={22} />
          ) : (
            <span className="size-[22px] shrink-0 rounded-full bg-chip" />
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13px] leading-[18px] font-medium text-ink">
              {m.name}
            </span>
            <span className="truncate text-[12px] leading-4 text-muted">
              {m.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
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
      {tools ? (
        <div className="relative flex w-full flex-col gap-1 rounded-control border border-control-border bg-white p-1 pl-3 focus-within:border-accent-line">
          {mentionList}
          <AttachmentChips
            items={chipsShown.map((c) => ({
              label: c.label,
              leading: <ChipIcon chip={c} />,
            }))}
            onRemove={(i) => chatContext.remove(chipsShown[i].key)}
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
                        : addFile(ATTACH_LABEL[kind], kind)
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
                    [...(e.target.files ?? [])].forEach((f) =>
                      addFile(f.name, 'upload')
                    );
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
        <div className="relative flex w-full items-end gap-1 rounded-control border border-control-border bg-white py-1 pr-1 pl-3 focus-within:border-accent-line">
          {mentionList}
          {field}
          {sendButton}
        </div>
      )}
    </div>
  );
}

// A context pill's icon: the helper's character, the block's kind tile (task, decision, output), or the attach
// menu's icon for files, links and skills. 16px.
const ATTACH_ICON = { upload: uploadIcon, link: linkIcon, skill: sparkIcon };
function ChipIcon({ chip }: { chip: ChatChip }) {
  if (chip.agent)
    return <AgentArt agent={chip.agent} size={16} className="shrink-0" />;
  if (chip.kind)
    return (
      <NodeKindTile
        kind={chip.kind}
        size={16}
        glyphSize={chip.kind === 'task' ? 9 : 8.5}
        radius={4}
      />
    );
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      <Icon src={ATTACH_ICON[chip.attach ?? 'upload']} size={12} />
    </span>
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
