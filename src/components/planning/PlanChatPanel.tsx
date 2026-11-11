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
  variant = 'panel',
  className,
}: {
  messages: PlanChatMessage[];
  suggestions?: string[];
  onSend: (text: string) => void;
  tab?: PanelTab;
  onTabChange?: (tab: PanelTab) => void;
  sandbox?: ReactNode;
  onClose?: () => void;
  /** 'column': the older left chat column of 2.4c (300px, "Chat with Pathfinder", no tabs), placed in the
   *  main panel by the screen. */
  variant?: 'panel' | 'column';
  className?: string;
}) {
  const end = useRef<HTMLDivElement>(null);
  const count = useRef(messages.length);
  useEffect(() => {
    if (messages.length > count.current)
      end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    count.current = messages.length;
  }, [messages.length]);

  const thread = (inset: 'panel' | 'column') => (
    <PanelThread inset={inset}>
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
  );

  if (variant === 'column')
    return (
      <section
        aria-label="Chat with Pathfinder"
        className="flex h-full w-[300px] shrink-0 flex-col items-start border-r border-line bg-white pb-[7px] max-xl:hidden"
      >
        <p className="shrink-0 px-4 pt-4 pb-2 text-[12px] leading-[18px] font-semibold tracking-[-0.08px] whitespace-nowrap text-ink-2">
          Chat with Pathfinder
        </p>
        <div className="flex min-h-px w-full flex-1 flex-col overflow-y-auto">
          {thread('column')}
        </div>
        <ChatComposer onSend={onSend} suggestions={suggestions} narrow />
      </section>
    );

  const showSandbox = tab === 'sandbox' && sandbox;
  return (
    <SidePanel
      className={className}
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
      {showSandbox ? sandbox : thread('panel')}
    </SidePanel>
  );
}
