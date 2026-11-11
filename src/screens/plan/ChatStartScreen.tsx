import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import arrowRightWhite from '@/assets/icons/arrow-right-white.svg';
import {
  WorkflowTopBar,
  type WorkflowView,
} from '@/components/nav/WorkflowTopBar';
import { PlanComposer } from '@/components/panels/ChatComposer';
import {
  AssistantMessage,
  ChatThread,
  UserMessage,
} from '@/components/panels/ChatMessage';
import {
  FileIcon,
  OutputCard,
  PanelSection,
  ResourceCard,
} from '@/components/panels/ResourcesPanel';
import { SidePanel } from '@/components/panels/SidePanel';
import { AppShell } from '@/components/shell/AppShell';
import { UserAvatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { screenPath } from '@/screens/registry';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['2.2', '2.2-attach'];

type Message = {
  id: number;
  from: 'assistant' | 'user';
  text: string;
  action?: 'team';
};

const START: Message[] = [
  {
    id: 1,
    from: 'assistant',
    text: "Hi, I'm the Planner. What are you launching? Describe it like you'd tell a friend.",
  },
  { id: 2, from: 'user', text: 'launch campaign for our new AI Coach feature' },
  {
    id: 3,
    from: 'assistant',
    text: 'Nice. Two quick questions so I can plan the right team:\n1. When is the launch? 2. Who is it for?',
  },
  { id: 4, from: 'user', text: 'Mar 12, to our 2,800 waitlist signups' },
  {
    id: 5,
    from: 'assistant',
    text: "Your team is ready: 7 helpers, from research to posting on launch day. Next you'll see them on a map, where you can change anything. Nothing runs until you press Start launch.",
    action: 'team',
  },
];

const ATTACH_REPLIES = {
  upload: 'Upload files',
  link: 'Paste a link',
  skill: 'Add a skill',
} as const;

const isDesktop = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(min-width: 1280px)').matches;

// Figma 2.2 "Chat start" (2362:23548) and 2.2-attach "Chat start · attach menu open" (2362:26366).
// The plan chat with the Planner, its composer, and the Resources & outputs side panel.
export default function ChatStartScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [attachOpen, setAttachOpen] = useState(id === '2.2-attach');
  const [panelOpen, setPanelOpen] = useState(isDesktop);
  const [view, setView] = useState<WorkflowView>('planning');
  const [messages, setMessages] = useState<Message[]>(START);
  const [goal, setGoal] = useState<string | undefined>();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el && messages.length > START.length)
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = (text: string) => {
    setGoal((g) => g ?? text);
    setMessages((m) => [
      ...m,
      { id: m.length + 1, from: 'user', text },
      {
        id: m.length + 2,
        from: 'assistant',
        text: "Got it. I've added that to the launch brief.",
      },
    ]);
  };

  const changeView = (v: WorkflowView) => {
    setView(v);
    if (v === 'flowchart') navigate(screenPath('3.1'));
  };

  const seeTeam = (
    <Button
      variant="primary"
      trailing={<Icon src={arrowRightWhite} size={16} />}
      onClick={() => navigate(screenPath('2.3'))}
    >
      See your team
    </Button>
  );

  return (
    <AppShell
      sidebar="none"
      aside={
        panelOpen && (
          <SidePanel
            title="Resources & outputs"
            onClose={() => setPanelOpen(false)}
          >
            <ResourcesBody goal={goal} />
          </SidePanel>
        )
      }
    >
      <WorkflowTopBar
        view={view}
        onViewChange={changeView}
        panelOpen={panelOpen}
        onTogglePanel={panelOpen ? undefined : () => setPanelOpen(true)}
      />
      <div className="flex min-h-px w-full flex-1 flex-col items-center bg-white">
        <div
          ref={scroller}
          className="flex min-h-px w-full flex-1 flex-col items-start overflow-y-auto"
        >
          <div className="flex w-full shrink-0 flex-col items-center">
            <ChatThread>
              {messages.map((m) =>
                m.from === 'user' ? (
                  <UserMessage key={m.id} text={m.text} />
                ) : (
                  <AssistantMessage key={m.id} text={m.text}>
                    {m.action === 'team' ? seeTeam : undefined}
                  </AssistantMessage>
                )
              )}
            </ChatThread>
          </div>
        </div>
        <div className="flex w-[620px] max-w-full shrink-0 flex-col items-start pt-3 pb-8 max-md:px-3 max-md:pb-3">
          <PlanComposer
            onSend={send}
            attachOpen={attachOpen}
            onAttachOpenChange={setAttachOpen}
            onAttach={(kind) => send(ATTACH_REPLIES[kind])}
          />
        </div>
      </div>
    </AppShell>
  );
}

function ResourcesBody({ goal }: { goal?: string }): ReactNode {
  return (
    <div className="flex w-full flex-col items-start gap-7 overflow-clip p-5">
      <PanelSection title="Outputs" count={1}>
        <OutputCard
          name="Launch brief"
          status="Draft"
          meta="Made by the Planner · updated just now"
          lines={[
            {
              label: 'What',
              value: 'Launch campaign for our new AI Coach feature',
            },
            { label: 'When', value: 'Mar 12' },
            { label: 'Who', value: '2,800 waitlist signups' },
            { label: 'Goal', value: goal },
            { label: 'Channels' },
          ]}
        />
      </PanelSection>
      <PanelSection title="Resources used" count={2}>
        <ResourceCard
          leading={<UserAvatar />}
          title="Your answers in this chat"
          description="“launch campaign for our new AI Coach feature” · “Mar 12, to our 2,800 waitlist signups”"
        />
        <ResourceCard
          leading={<FileIcon type="PDF" />}
          title="Brand guide.pdf"
          description="12 pages · used for tone of voice"
        />
      </PanelSection>
    </div>
  );
}

