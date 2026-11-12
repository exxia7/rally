import { useLayoutEffect, useRef, type ReactNode } from 'react';

import { ChatComposer } from '@/components/panels/ChatComposer';
import { Message, Thread } from '@/components/panels/ChatMessage';
import { PanelTabs, type PanelTab } from '@/components/panels/PanelTabs';
import { ScrollArea } from '@/components/panels/ScrollArea';
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
// The thread scrolls between the tabs and the composer (SidePanel's ScrollArea: line under the tabs while scrolled,
// fade at the cut). A long chat opens on its latest message, and a new message scrolls the thread (only the thread,
// never the page or the map) down to it.
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
  /** 'column': the older left chat column of 2.4c (300px, "Chat with Rally", no tabs), placed in the
   *  main panel by the screen. */
  variant?: 'panel' | 'column';
  className?: string;
}) {
  const body = useRef<HTMLDivElement>(null);
  const count = useRef<number | null>(null);
  const showSandbox = tab === 'sandbox' && sandbox;
  useLayoutEffect(() => {
    const el = body.current;
    // On the Sandbox tab, forget the position: coming back opens on the latest message again.
    if (!el || showSandbox) {
      count.current = null;
      return;
    }
    const seen = count.current;
    count.current = messages.length;
    // First paint: jump to the latest message. A short chat has nothing to scroll, so a frame as drawn stays at the
    // top. After that, glide down when a message arrives (a jump under reduced motion).
    if (seen === null) el.scrollTop = el.scrollHeight;
    else if (messages.length > seen)
      el.scrollTo({
        top: el.scrollHeight,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
  }, [messages.length, showSandbox]);

  const thread = (inset?: 'narrow') => (
    <Thread inset={inset}>
      {messages.map((m) => (
        <Message key={m.id} from={m.from} text={m.text}>
          {m.extra}
        </Message>
      ))}
    </Thread>
  );

  if (variant === 'column')
    return (
      <section
        aria-label="Chat with Rally"
        className="flex h-full w-[300px] shrink-0 flex-col items-start border-r border-line bg-white pb-[7px] max-xl:hidden"
      >
        <p className="shrink-0 px-4 pt-4 pb-2 text-[12px] leading-[18px] font-semibold tracking-[-0.08px] whitespace-nowrap text-ink-2">
          Chat with Rally
        </p>
        <ScrollArea ref={body}>{thread('narrow')}</ScrollArea>
        <ChatComposer onSend={onSend} suggestions={suggestions} narrow />
      </section>
    );

  return (
    <SidePanel
      className={className}
      bodyRef={body}
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
      {showSandbox ? sandbox : thread()}
    </SidePanel>
  );
}
