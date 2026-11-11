import { useEffect, useRef, type ReactNode } from 'react';

import { ChatComposer } from '@/components/panels/ChatComposer';
import {
  PanelAssistantMessage,
  PanelThread,
  PanelUserMessage,
} from '@/components/panels/ChatMessage';
import { PanelTabs, type PanelTab } from '@/components/panels/PanelTabs';
import { SidePanel } from '@/components/panels/SidePanel';

export type PlanChatMessage = {
  id: number | string;
  from: 'assistant' | 'user';
  text: ReactNode;
  /** Rendered inside the assistant bubble under the text (e.g. an Undo button). */
  extra?: ReactNode;
};

// The planning side panel's Chat tab (2.3 "Sidebar", 2362:23712): Panel tabs (Chat · Sandbox), the side-panel
// thread, and the Chat composer pinned at the bottom with optional suggestions. Controlled: the screen owns the
// messages and decides what a sent message does. Sandbox shows `sandbox` when given, else calls onTabChange.
export function PlanChatPanel({
  messages,
  suggestions,
  onSend,
  tab = 'chat',
  onTabChange,
  sandbox,
  onClose,
}: {
  messages: PlanChatMessage[];
  suggestions?: string[];
  onSend: (text: string) => void;
  tab?: PanelTab;
  onTabChange?: (tab: PanelTab) => void;
  sandbox?: ReactNode;
  onClose?: () => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  const count = useRef(messages.length);
  useEffect(() => {
    if (messages.length > count.current)
      end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    count.current = messages.length;
  }, [messages.length]);

  const showSandbox = tab === 'sandbox' && sandbox;
  return (
    <SidePanel
      tabs={
        <PanelTabs
          phase="plan"
          value={tab}
          onChange={(t) => onTabChange?.(t)}
        />
      }
      onClose={onClose}
      footer={
        showSandbox ? undefined : (
          <ChatComposer onSend={onSend} suggestions={suggestions} />
        )
      }
    >
      {showSandbox ? (
        sandbox
      ) : (
        <PanelThread>
          {messages.map((m) =>
            m.from === 'user' ? (
              <PanelUserMessage key={m.id} text={m.text} />
            ) : (
              <PanelAssistantMessage key={m.id} text={m.text}>
                {m.extra}
              </PanelAssistantMessage>
            )
          )}
          <div ref={end} />
        </PanelThread>
      )}
    </SidePanel>
  );
}
