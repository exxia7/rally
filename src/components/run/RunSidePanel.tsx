import { useEffect, useRef, useState } from 'react';

import { ChatComposer } from '@/components/panels/ChatComposer';
import {
  AssistantMessage,
  type MessageFrom,
  UserMessage,
} from '@/components/panels/ChatMessage';
import { helperReply, mentionables } from '@/state/chatContext';
import { type Decision, DecisionLog } from '@/components/panels/DecisionLog';
import { PanelTabs, type PanelTab } from '@/components/panels/PanelTabs';
import { SidePanel } from '@/components/panels/SidePanel';
import { helperOfStep } from '@/state/runView';
import { dispatch, useWorkflow } from '@/state/store';
import type { MenuItemData } from '@/components/ui/Menu';

import {
  type SandboxItem,
  SandboxPanel,
  type SandboxSection,
} from './SandboxPanel';

export type RunChatMessage = {
  from: 'assistant' | 'user';
  text: string;
  /** A helper's reply (you @mentioned it or sent with its block). */
  sender?: MessageFrom;
};

/** A step that hasn't started: the run Sandbox's "Add to…" menu offers it. */
export type SandboxStep = { id: string; name: string; detail: string };

// The run side panel (3.3 Sandbox 2362:24915, 3.4 Decisions 2362:25044): SidePanel with run Panel tabs
// (Chat · Sandbox · Decisions · N). Figma also puts a Primary "Import" beside the tabs on Sandbox; removed (design
// review, design/non-figma-ui.md): each Sandbox section's "+" imports into it, so the tab row is the same on every tab.
// Docked at ≥1280px (the top bar's panel toggle closes it); an overlay with × below 1280, a sheet below 768.
export function RunSidePanel({
  tab,
  onTabChange,
  onClose,
  sandbox,
  decisions,
  decisionsMore,
  chat,
  chatSuggestions,
  onDecisionChange,
  onDecisionFork,
  steps = [],
}: {
  steps?: SandboxStep[];
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onClose: () => void;
  sandbox: SandboxSection[];
  decisions: Decision[];
  decisionsMore?: string;
  /** Opening messages of the run chat. */
  chat: RunChatMessage[];
  chatSuggestions?: string[];
  onDecisionChange?: (d: Decision) => void;
  onDecisionFork?: (d: Decision) => void;
}) {
  const [sections, setSections] = useState(sandbox);
  const [imports, setImports] = useState(0);
  // Import adds to Assets; a section's "+" imports into that section (Skills get a skill, others a file). The
  // panel shows it at once; the store keeps it (`sandbox/import`), so the next visit and the plan see it too.
  const importFile = (into?: SandboxSection) => {
    setImports((n) => n + 1);
    const target = into?.id === 'skills' ? into.id : sections[0]?.id;
    const taken = sections.flatMap((s) => s.items.map((i) => i.name));
    const nameFor = (k: number) =>
      target === 'skills' ? `New skill ${k}` : `Upload ${k}.pdf`;
    let n = 1;
    while (taken.includes(nameFor(n))) n++;
    const name = nameFor(n);
    if (target === 'assets' || target === 'skills')
      dispatch({ type: 'sandbox/import', section: target, name });
    setSections((prev) =>
      prev.map((s) =>
        s.id === target
          ? {
              ...s,
              open: true,
              items: [{ name, source: 'New · not used yet' }, ...s.items],
            }
          : s
      )
    );
  };

  // "Add to <step>…" on a row: only steps that haven't started take new items (the Sandbox note says so). The
  // store gives it to that step's helper (`sandbox/give`: its files, skills or tools); the row updates at once.
  const addTo = (
    item: SandboxItem,
    section: SandboxSection,
    step: SandboxStep
  ) => {
    const helper = helperOfStep(step.id);
    if (
      helper &&
      (section.id === 'assets' ||
        section.id === 'skills' ||
        section.id === 'tools')
    )
      dispatch({
        type: 'sandbox/give',
        section: section.id,
        name: item.name,
        helper,
      });
    setSections((prev) =>
      prev.map((s) =>
        s.id === section.id
          ? {
              ...s,
              items: s.items.map((it) =>
                it.name === item.name
                  ? {
                      ...it,
                      source: it.source.startsWith('New')
                        ? step.name
                        : it.source.includes(step.name)
                          ? it.source
                          : `${it.source}, ${step.name}`,
                    }
                  : it
              ),
            }
          : s
      )
    );
  };
  const rowMenu = (
    item: SandboxItem,
    section: SandboxSection
  ): MenuItemData[] | undefined => {
    if (section.content) return undefined;
    if (!steps.length)
      return [
        {
          key: 'none',
          label: 'Every step has started',
          description: 'New items apply to the next run',
        },
      ];
    return steps.map((st) => ({
      key: st.id,
      label: `Add to ${st.name}`,
      description: item.source.includes(st.name)
        ? 'Already has it'
        : `${st.detail} · hasn’t started`,
      onSelect: () => addTo(item, section, st),
    }));
  };

  // A decision's "Change" opens the Chat tab with "Change: <decision> → " typed; sending it updates the entry.
  const [log, setLog] = useState(decisions);
  const [changing, setChanging] = useState<Decision | null>(null);
  const changeDecision = (d: Decision) => {
    setChanging(d);
    if (onDecisionChange) onDecisionChange(d);
    else onTabChange('chat');
  };
  const applyChange = (text: string) => {
    if (!changing) return null;
    const prefix = `Change: ${changing.title} →`;
    const to = text.startsWith(prefix)
      ? text.slice(prefix.length).trim()
      : text.replace(/^change:?/i, '').trim();
    if (!to) return null;
    const old = changing.title;
    // The store records it in decisions[] (`decision/change`); a date, time, price or budget in it becomes the
    // launch fact the steps that haven't run read. The log here updates at once.
    dispatch({
      type: 'decision/change',
      id: changing.id,
      from: old,
      title: to,
    });
    const time = new Date()
      .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      .toLowerCase();
    setLog((all) =>
      all.map((d) =>
        d.id === changing.id
          ? {
              ...d,
              title: to,
              basis: `You changed it from “${old}”`,
              tag: 'Changed by you',
              time,
            }
          : d
      )
    );
    setChanging(null);
    return `Updated: ${to}. It’s in the decision log, and the helpers whose steps haven’t started will use it.`;
  };

  return (
    <SidePanel
      onClose={onClose}
      tabs={
        <PanelTabs
          phase="run"
          value={tab}
          onChange={onTabChange}
          decisions={decisions.length}
        />
      }
    >
      {tab === 'sandbox' && (
        // Remount when an import lands so the Assets section opens on it.
        <SandboxPanel
          key={imports}
          sections={sections}
          rowMenu={rowMenu}
          onAdd={importFile}
        />
      )}
      {tab === 'decisions' && (
        <DecisionLog
          decisions={log}
          more={decisionsMore}
          onChange={changeDecision}
          onFork={onDecisionFork}
        />
      )}
      {tab === 'chat' && (
        <RunChat
          initial={chat}
          suggestions={chatSuggestions}
          draft={changing ? `Change: ${changing.title} → ` : undefined}
          onSendChange={changing ? applyChange : undefined}
        />
      )}
    </SidePanel>
  );
}

// The Chat tab while a run is going: the Planner's thread (24px sides) and the Chat composer pinned below.
function RunChat({
  initial,
  suggestions,
  draft,
  onSendChange,
}: {
  initial: RunChatMessage[];
  suggestions?: string[];
  /** Prefilled composer text (a decision's Change). */
  draft?: string;
  /** Applies a decision change; returns the reply, or null when the text wasn't one. */
  onSendChange?: (text: string) => string | null;
}) {
  const wf = useWorkflow();
  const [messages, setMessages] = useState(initial);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el && messages.length > initial.length)
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, initial.length]);

  const send = (text: string, meta?: { about: string[] }) => {
    const fromHelper = helperReply(wf, text, meta?.about);
    if (fromHelper) {
      setMessages((m) => [
        ...m,
        { from: 'user', text },
        {
          from: 'assistant',
          text: fromHelper.text,
          sender: {
            name: fromHelper.helper.name,
            agent: fromHelper.helper.agent,
          },
        },
      ]);
      return;
    }
    const changed = onSendChange?.(text);
    setMessages((m) => [
      ...m,
      { from: 'user', text },
      {
        from: 'assistant',
        text:
          changed ??
          'Got it. I’ll pass that to the helpers whose steps haven’t started yet.',
      },
    ]);
  };

  return (
    <div className="flex min-h-px w-full flex-1 flex-col">
      <div
        ref={scroller}
        className="flex min-h-px w-full flex-1 flex-col items-end gap-4 overflow-y-auto px-6 pt-2 pb-4 max-md:px-4"
      >
        {messages.map((m, i) =>
          m.from === 'user' ? (
            <UserMessage key={i} text={m.text} wrap />
          ) : (
            <AssistantMessage key={i} text={m.text} from={m.sender} />
          )
        )}
      </div>
      <ChatComposer
        key={draft}
        defaultText={draft}
        onSend={send}
        suggestions={messages.length === initial.length ? suggestions : []}
        attachable
        model={wf.model}
        onModelChange={(model) => dispatch({ type: 'brief/model', model })}
        mentions={mentionables(wf)}
      />
    </div>
  );
}
