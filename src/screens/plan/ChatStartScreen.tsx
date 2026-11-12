import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';

import arrowRightWhite from '@/assets/icons/arrow-right-white.svg';
import {
  WorkflowTopBar,
  type WorkflowView,
} from '@/components/nav/WorkflowTopBar';
import {
  ATTACH_LABEL,
  AttachmentChips,
} from '@/components/panels/AttachMenu';
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
import { Modal } from '@/components/ui/Modal';
import { AI_COACH_BRIEF } from '@/screens/plan/aiCoachPlan';
import { useGo } from '@/state/nav';
import { runFrame } from '@/state/runView';
import { dispatch, useWorkflow } from '@/state/store';
import type { Brief } from '@/state/types';

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

const isDesktop = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(min-width: 1280px)').matches;

// Figma 2.2 "Chat start" (2362:23548) and 2.2-attach "Chat start · attach menu open" (2362:26366).
// The plan chat with the Planner, its composer, and the Resources & outputs side panel.
export default function ChatStartScreen() {
  const go = useGo();
  const { id } = useParams();
  const [attachOpen, setAttachOpen] = useState(id === '2.2-attach');
  const [panelOpen, setPanelOpen] = useState(isDesktop);
  const [view, setView] = useState<WorkflowView>('planning');
  const wf = useWorkflow();
  // The chat lives in the store: your brief from 2.1 is the first thing you said.
  const [messages, setMessages] = useState<Message[]>(() =>
    wf.briefChat.length
      ? wf.briefChat.map((m, i) => ({
          id: i + 1,
          from: m.from,
          text: m.text,
          action: m.action,
        }))
      : START
  );
  const [goal, setGoal] = useState<string | undefined>();
  const scroller = useRef<HTMLDivElement>(null);
  // Attach works as on 2.1: Upload files opens the file picker, a link or skill becomes a chip. Sending moves
  // the chips into the panel's "Resources used".
  const [attachments, setAttachments] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const attach = (kind: 'upload' | 'link' | 'skill') => {
    if (kind === 'upload') fileInput.current?.click();
    else setAttachments((a) => [...a, ATTACH_LABEL[kind]]);
  };
  const showAnswers = () => {
    if (!isDesktop()) setPanelOpen(false);
    scroller.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = scroller.current;
    if (el && messages.length > START.length)
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = (text: string) => {
    setGoal((g) => g ?? text);
    dispatch({
      type: 'briefChat/send',
      text,
      reply: attachments.length
        ? `Got it. I've added that to the launch brief, and I'll use ${attachments.join(', ')} too.`
        : "Got it. I've added that to the launch brief.",
    });
    const added = attachments;
    setAttachments([]);
    setResources((r) => [...r, ...added]);
    setMessages((m) => [
      ...m,
      { id: m.length + 1, from: 'user', text },
      {
        id: m.length + 2,
        from: 'assistant',
        text: added.length
          ? `Got it. I've added that to the launch brief, and I'll use ${added.join(', ')} too.`
          : "Got it. I've added that to the launch brief.",
      },
    ]);
  };

  const changeView = (v: WorkflowView) => {
    setView(v);
    if (v === 'flowchart') go(runFrame(wf), { returnHere: true });
  };

  const seeTeam = (
    <Button
      variant="primary"
      trailing={<Icon src={arrowRightWhite} size={16} />}
      onClick={() => {
        dispatch({ type: 'plan/stage', stage: 'team' });
        go('2.3');
      }}
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
            <ResourcesBody
              goal={goal}
              extra={resources}
              onShowAnswers={showAnswers}
            />
          </SidePanel>
        )
      }
    >
      <WorkflowTopBar
        title={wf.title}
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
            onAttach={attach}
          />
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const names = [...(e.target.files ?? [])].map((f) => f.name);
              setAttachments((a) => [...a, ...names]);
              e.target.value = '';
            }}
          />
          <AttachmentChips
            items={attachments}
            onRemove={(i) =>
              setAttachments((all) => all.filter((_, j) => j !== i))
            }
          />
        </div>
      </div>
    </AppShell>
  );
}

const BRIEF_LINES = (goal: string | undefined, brief: Brief) => [
  // The brief as you typed it, capitalised ("launch campaign…" → "Launch campaign…").
  { label: 'What', value: brief.what.charAt(0).toUpperCase() + brief.what.slice(1) },
  { label: 'When', value: brief.when || AI_COACH_BRIEF.when },
  { label: 'Who', value: brief.who || AI_COACH_BRIEF.who },
  { label: 'Goal', value: goal ?? brief.goal },
  { label: 'Channels' },
];

// What the Planner took from the brand guide (shown when you open the file).
const BRAND_GUIDE = [
  { label: 'Voice', value: 'Warm and plain. Short sentences, no jargon.' },
  { label: 'Names', value: '“AI Coach”, always two words, capital C' },
  { label: 'Avoid', value: 'Exclamation marks, “revolutionary”, emoji in email' },
];

function ResourcesBody({
  goal,
  extra,
  onShowAnswers,
}: {
  goal?: string;
  extra: string[];
  onShowAnswers: () => void;
}): ReactNode {
  const [open, setOpen] = useState<'brief' | 'guide' | null>(null);
  const wf = useWorkflow();
  const answers = wf.briefChat
    .filter((m) => m.from === 'user')
    .slice(0, 2)
    .map((m) => `“${m.text}”`)
    .join(' · ');
  return (
    <div className="flex w-full flex-col items-start gap-7 overflow-clip p-5">
      <PanelSection title="Outputs" count={1}>
        <OutputCard
          name="Launch brief"
          status="Draft"
          meta="Made by the Planner · updated just now"
          lines={BRIEF_LINES(goal, wf.brief)}
          onOpen={() => setOpen('brief')}
        />
      </PanelSection>
      <PanelSection title="Resources used" count={2 + extra.length}>
        <ResourceCard
          leading={<UserAvatar />}
          title="Your answers in this chat"
          description={answers}
          onClick={onShowAnswers}
        />
        <ResourceCard
          leading={<FileIcon type="PDF" />}
          title="Brand guide.pdf"
          description="12 pages · used for tone of voice"
          onClick={() => setOpen('guide')}
        />
        {extra.map((name, i) => (
          <ResourceCard
            key={`${name}-${i}`}
            leading={
              <FileIcon type={name.split('.').pop()?.slice(0, 4).toUpperCase() ?? 'FILE'} />
            }
            title={name}
            description="Added in this chat"
          />
        ))}
      </PanelSection>
      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        label={open === 'guide' ? 'Brand guide.pdf' : 'Launch brief'}
      >
        <div className="flex w-full flex-col items-start gap-1.5">
          <p className="w-full text-[18px] leading-[26px] font-semibold text-ink">
            {open === 'guide' ? 'Brand guide.pdf' : 'Launch brief'}
          </p>
          <p className="w-full text-[13px] leading-[19px] text-ink-2">
            {open === 'guide'
              ? '12 pages. The Planner uses it for tone of voice.'
              : 'The Planner keeps this up to date as you chat. Every helper reads it.'}
          </p>
        </div>
        <dl className="flex w-full flex-col items-start gap-1.5 rounded-[10px] bg-well px-3.5 py-3 text-[13px] leading-[19px]">
          {(open === 'guide' ? BRAND_GUIDE : BRIEF_LINES(goal, wf.brief)).map((l) => (
            <div key={l.label} className="flex w-full items-start gap-2">
              <dt className="w-[72px] shrink-0 text-muted">{l.label}</dt>
              <dd
                className={
                  l.value
                    ? 'min-w-px flex-1 font-medium text-ink'
                    : 'min-w-px flex-1 text-[#a1a3a9]'
                }
              >
                {l.value ?? 'Not set yet'}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex w-full justify-end">
          <Button variant="secondary" onClick={() => setOpen(null)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
