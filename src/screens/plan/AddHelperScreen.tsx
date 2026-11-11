import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { OutputItem } from '@/components/panels/OutputsCard';
import {
  type AskLevel,
  PermissionPicker,
} from '@/components/planning/PermissionPicker';
import { PlanCanvas } from '@/components/planning/PlanCanvas';
import {
  PlanChatPanel,
  type PlanChatMessage,
} from '@/components/planning/PlanChatPanel';
import type { PlanNode } from '@/components/planning/PlanMap';
import { PlanTopBar } from '@/components/planning/PlanTopBar';
import { AppShell } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/Button';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { screenPath } from '@/screens/registry';

import {
  AI_COACH_OUTPUTS,
  AI_COACH_PLAN,
  PLAN_CHAT_SUGGESTIONS,
} from './aiCoachPlan';
import { COMMUNITY_OUTPUTS, COMMUNITY_PLAN } from './communityPlan';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['2.5', '2.4e'];

// Figma 2.5 "Add a helper" (2362:24186) and 2.4e "Ask before a step runs" (2362:27674).
// 2.5: the chat added a Community helper (dashed "New" card above Publisher) and a Discord post; Undo takes both
// back, and asking again re-adds them. 2.4e: click a helper that posts (Publisher, Community) → its "Before …
// runs" picker opens beside it, the rest of the team fades, and the choice rewrites the card's Posts / Ads rows.
// "Permissions" opens 2.7; Sandbox opens 2.6; other helpers open their drawer (2.4).

type Poster = 'publisher' | 'community';
type Msg = PlanChatMessage & { undo?: boolean };

const DISCORD_ASK = PLAN_CHAT_SUGGESTIONS[0];

const added = (n: number): Msg[] => [
  { id: `ask-${n}`, from: 'user', text: DISCORD_ASK },
  {
    id: `idea-${n}`,
    from: 'assistant',
    text: "Good idea. I'll add a Community helper that turns your launch copy into a Discord post.",
  },
  {
    id: `check-${n}`,
    from: 'assistant',
    text: 'Should it check with you before posting?',
  },
  { id: `yes-${n}`, from: 'user', text: 'Yes, ask me first' },
  {
    id: `done-${n}`,
    from: 'assistant',
    text: 'Done. It\'ll post after you approve, along with Publisher. I also added "Discord post" to What goes out.',
    undo: true,
  },
];

const SUMMARY: Record<Poster, string> = {
  publisher: 'Publisher posts for you and can spend up to $50 on ads.',
  community: 'Community posts your launch in Discord.',
};

// What each choice writes on the card. Rows that differ from "Ask me first" show highlighted (just changed).
const ROWS: Record<Poster, Record<AskLevel, Record<string, string>>> = {
  publisher: {
    'ask-first': { Ads: 'Up to $50', Posts: 'After your OK' },
    'spends-money': { Ads: 'After your OK', Posts: 'On schedule' },
    'just-go': { Ads: 'Up to $50', Posts: 'On its own' },
  },
  community: {
    'ask-first': { Posts: 'After your OK' },
    'spends-money': { Posts: 'On schedule' },
    'just-go': { Posts: 'On its own' },
  },
};

const REPLY: Record<AskLevel, (name: string) => string> = {
  'ask-first': (n) => `${n} will wait for your OK before it posts or spends.`,
  'spends-money': (n) =>
    `${n} will post on schedule and ask before any ad spend.`,
  'just-go': (n) =>
    `${n} will run without asking. Workspace rules still apply.`,
};

const isPoster = (id: string): id is Poster =>
  id === 'publisher' || id === 'community';

const isDesktop = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(min-width: 1280px)').matches;

export default function AddHelperScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [community, setCommunity] = useState(true);
  const [picker, setPicker] = useState<Poster | null>(
    id === '2.4e' ? 'publisher' : null
  );
  const [ask, setAsk] = useState<Record<Poster, AskLevel>>({
    publisher: 'ask-first',
    community: 'ask-first',
  });
  const [panelOpen, setPanelOpen] = useState(isDesktop);
  const [messages, setMessages] = useState<Msg[]>(() => added(0));
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const pickerRef = useRef<HTMLDivElement>(null);
  const refs = useMemo(() => [pickerRef], []);
  const closePicker = useCallback(() => setPicker(null), []);
  useOutsideClick(refs, picker !== null, closePicker);

  const outputs: OutputItem[] = community
    ? COMMUNITY_OUTPUTS
    : AI_COACH_OUTPUTS;
  const layout = community ? COMMUNITY_PLAN : AI_COACH_PLAN;

  const nodes: PlanNode[] = layout.nodes.map((n) => {
    const node: PlanNode = isPoster(n.id)
      ? {
          ...n,
          settings: n.settings.map((s) => {
            const value = ROWS[n.id as Poster][ask[n.id as Poster]][s.label];
            if (value === undefined) return s;
            const was = ROWS[n.id as Poster]['ask-first'][s.label];
            return { ...s, value, highlighted: value !== was };
          }),
        }
      : n;
    if (!picker) return node;
    return n.id === picker
      ? { ...node, selected: 'accent' }
      : { ...node, opacity: 0.4 }; // Dimmed, but a New card keeps its badge and dashed border.
  });
  const pickerNode = picker && nodes.find((n) => n.id === picker);

  const undo = () => {
    setCommunity(false);
    setPicker((p) => (p === 'community' ? null : p));
    setMessages((m) => [
      ...m.map((x) => ({ ...x, undo: false })),
      {
        id: `undone-${m.length}`,
        from: 'assistant',
        text: 'Undone. No Community helper, and Discord post is off What goes out.',
      },
    ]);
    setSuggestions([DISCORD_ASK]);
  };

  const send = (text: string) => {
    setSuggestions((s) => s.filter((x) => x !== text));
    if (!community && (text === DISCORD_ASK || /discord/i.test(text))) {
      setCommunity(true);
      setAsk((a) => ({ ...a, community: 'ask-first' }));
      setMessages((m) => [
        ...m.map((x) => ({ ...x, undo: false })),
        ...added(m.length).map((x, i) => (i === 0 ? { ...x, text } : x)),
      ]);
      return;
    }
    setMessages((m) => [
      ...m,
      { id: `u-${m.length}`, from: 'user', text },
      {
        id: `a-${m.length}`,
        from: 'assistant',
        text: "Got it. I'll fold that into the plan. Nothing runs until you press Start launch.",
      },
    ]);
  };

  const choose = (helper: Poster, level: AskLevel) => {
    setAsk((a) => ({ ...a, [helper]: level }));
    const name = helper === 'publisher' ? 'Publisher' : 'Community';
    setMessages((m) => [
      ...m,
      {
        id: `ask-level-${m.length}`,
        from: 'assistant',
        text: REPLY[level](name),
      },
    ]);
  };

  return (
    <AppShell
      sidebar="none"
      aside={
        panelOpen && (
          <PlanChatPanel
            messages={messages.map((m) => ({
              ...m,
              extra: m.undo ? (
                <Button size="sm" className="w-[57px]" onClick={undo}>
                  Undo
                </Button>
              ) : undefined,
            }))}
            suggestions={suggestions}
            onSend={send}
            tab="chat"
            onTabChange={(t) => t === 'sandbox' && navigate(screenPath('2.6'))}
            onClose={() => setPanelOpen(false)}
          />
        )
      }
    >
      <PlanTopBar
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((o) => !o)}
      />
      <PlanCanvas
        layout={layout}
        nodes={nodes}
        outputs={outputs}
        outputsKey={outputs.map((o) => o.id).join()}
        onNodeClick={(n) =>
          isPoster(n.id)
            ? setPicker((p) => (p === n.id ? null : (n.id as Poster)))
            : navigate(screenPath('2.4'))
        }
        onSettingClick={(n) =>
          isPoster(n.id)
            ? setPicker(n.id as Poster)
            : navigate(screenPath('2.4'))
        }
        focus={
          pickerNode
            ? { x: pickerNode.x - 140, y: pickerNode.y + 160 }
            : undefined
        }
        overlays={
          pickerNode
            ? [
                {
                  id: 'permission-picker',
                  x: pickerNode.x - 282.2,
                  y: Math.max(8, pickerNode.y - 121.57),
                  content: (
                    <div ref={pickerRef}>
                      <PermissionPicker
                        helper={pickerNode.name}
                        summary={SUMMARY[picker]}
                        value={ask[picker]}
                        onChange={(level) => choose(picker, level)}
                        onPermissions={() => navigate(screenPath('2.7'))}
                        scale={0.85}
                      />
                    </div>
                  ),
                },
              ]
            : undefined
        }
      />
    </AppShell>
  );
}
