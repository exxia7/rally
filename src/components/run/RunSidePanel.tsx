import { useEffect, useRef, useState } from 'react';

import plusWhite from '@/assets/icons/plus-white.svg';
import { ChatComposer } from '@/components/panels/ChatComposer';
import { AssistantMessage, UserMessage } from '@/components/panels/ChatMessage';
import { type Decision, DecisionLog } from '@/components/panels/DecisionLog';
import { PanelTabs, type PanelTab } from '@/components/panels/PanelTabs';
import { SidePanel } from '@/components/panels/SidePanel';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

import { SandboxPanel, type SandboxSection } from './SandboxPanel';

export type RunChatMessage = { from: 'assistant' | 'user'; text: string };

// The run side panel (3.3 Sandbox 2362:24915, 3.4 Decisions 2362:25044): SidePanel with run Panel tabs
// (Chat · Sandbox · Decisions · N). Sandbox adds a Primary Small "Import" on the right of the tabs.
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
}: {
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
  const importFile = () => {
    const n = imports + 1;
    setImports(n);
    setSections((prev) =>
      prev.map((s, i) =>
        i === 0
          ? {
              ...s,
              open: true,
              items: [
                { name: `Upload ${n}.pdf`, source: 'New · not used yet' },
                ...s.items,
              ],
            }
          : s
      )
    );
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
      headerExtra={
        tab === 'sandbox' && (
          <Button
            variant="primary"
            size="sm"
            leading={<Icon src={plusWhite} size={16} />}
            onClick={importFile}
            aria-label="Import"
            className="max-md:px-1.5"
          >
            <span className="max-md:hidden">Import</span>
          </Button>
        )
      }
    >
      {tab === 'sandbox' && (
        // Remount when an import lands so the Assets section opens on it.
        <SandboxPanel key={imports} sections={sections} />
      )}
      {tab === 'decisions' && (
        <DecisionLog
          decisions={decisions}
          more={decisionsMore}
          onChange={onDecisionChange}
          onFork={onDecisionFork}
        />
      )}
      {tab === 'chat' && (
        <RunChat initial={chat} suggestions={chatSuggestions} />
      )}
    </SidePanel>
  );
}

// The Chat tab while a run is going: the Planner's thread (24px sides) and the Chat composer pinned below.
function RunChat({
  initial,
  suggestions,
}: {
  initial: RunChatMessage[];
  suggestions?: string[];
}) {
  const [messages, setMessages] = useState(initial);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el && messages.length > initial.length)
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, initial.length]);

  const send = (text: string) =>
    setMessages((m) => [
      ...m,
      { from: 'user', text },
      {
        from: 'assistant',
        text: 'Got it. I’ll pass that to the helpers whose steps haven’t started yet.',
      },
    ]);

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
            <AssistantMessage key={i} text={m.text} />
          )
        )}
      </div>
      <ChatComposer
        onSend={send}
        suggestions={messages.length === initial.length ? suggestions : []}
      />
    </div>
  );
}
