import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { OutputItem } from '@/components/panels/OutputsCard';
import type { PanelTab } from '@/components/panels/PanelTabs';
import {
  HelperDrawer,
  type HelperDraft,
} from '@/components/planning/HelperDrawer';
import { PlanCanvas } from '@/components/planning/PlanCanvas';
import {
  PlanChatPanel,
  type PlanChatMessage,
} from '@/components/planning/PlanChatPanel';
import type { PlanNode } from '@/components/planning/PlanMap';
import { PlanTopBar } from '@/components/planning/PlanTopBar';
import { ToolPicker } from '@/components/planning/ToolPicker';
import { AppShell } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/Button';
import { screenPath } from '@/screens/registry';

import {
  AI_COACH_OUTPUTS,
  AI_COACH_PLAN,
  AI_COACH_PLAN_COMPACT,
  AI_COACH_TEAM,
  type Helper,
  type HelperId,
  modelCost,
  PLAN_CHAT_INTRO,
  PLAN_CHAT_SUGGESTIONS,
  planNodes,
} from './aiCoachPlan';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['2.3', '2.4', '2.4b', '2.4b-full', '2.4d'];

// Figma 2.3 "Proposed team" (2362:23641) and its editing states, one screen with real local state:
// - 2.4 "Edit a helper · drawer" (2362:23725): click a helper card → the helper drawer replaces the chat panel,
//   the map shrinks beside it and the other helpers fade.
// - 2.4b "Edit on the card" (2362:23869): click a card's Tools row → the tool picker opens on the card.
// - 2.4b-full "· full editor" (2362:27783): "Open full editor" → the drawer for that helper.
// - The Discord suggestion ("I also want to post on our Discord forum.") goes to 2.5 "Add a helper".
// - 2.4d "Edit by chat" (2362:24093): ask the chat ("Make the Writer more playful…") → the Writer card updates,
//   What goes out gets a TikTok script, and Undo puts both back.
// Flowchart and Start launch go on to the run (3.1).

type Msg = PlanChatMessage & { undo?: boolean };

const INTRO: Msg[] = PLAN_CHAT_INTRO.map((text, i) => ({
  id: `intro-${i}`,
  from: 'assistant',
  text,
}));

const WRITER_ASK = PLAN_CHAT_SUGGESTIONS[1];
const DISCORD_ASK = PLAN_CHAT_SUGGESTIONS[0];

const PLAYFUL_WRITER: Partial<Helper> = {
  description: 'Writes your posts, email and a TikTok script',
  tone: 'Playful',
  state: 'updated',
};
const TIKTOK: OutputItem = {
  id: 'tiktok',
  label: 'TikTok script',
  type: 'page',
  isNew: true,
};

const isDesktop = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(min-width: 1280px)').matches;

export default function TeamMapScreen() {
  const navigate = useNavigate();
  const { id = '2.3' } = useParams();
  const byChat = id === '2.4d';

  const [team, setTeam] = useState<Record<HelperId, Helper>>(() =>
    byChat
      ? {
          ...AI_COACH_TEAM,
          writer: { ...AI_COACH_TEAM.writer, ...PLAYFUL_WRITER },
        }
      : AI_COACH_TEAM
  );
  const [removed, setRemoved] = useState<HelperId[]>([]);
  const [drawer, setDrawer] = useState<HelperId | null>(
    id === '2.4' ? 'strategist' : id === '2.4b-full' ? 'scout' : null
  );
  const [picker, setPicker] = useState<HelperId | null>(
    id === '2.4b' ? 'scout' : null
  );
  const [panelOpen, setPanelOpen] = useState(
    () => isDesktop() || drawer !== null
  );
  const [tab, setTab] = useState<PanelTab>('chat');
  const [outputs, setOutputs] = useState<OutputItem[]>(
    byChat ? [...AI_COACH_OUTPUTS, TIKTOK] : AI_COACH_OUTPUTS
  );
  const [messages, setMessages] = useState<Msg[]>(
    byChat
      ? [
          ...INTRO,
          { id: 'ask', from: 'user', text: WRITER_ASK },
          { id: 'done', from: 'assistant', text: WRITER_DONE, undo: true },
        ]
      : INTRO
  );
  const [suggestions, setSuggestions] = useState(
    byChat ? [] : PLAN_CHAT_SUGGESTIONS
  );

  const patch = (helper: HelperId, p: Partial<Helper>) =>
    setTeam((t) => ({ ...t, [helper]: { ...t[helper], ...p } }));

  const openDrawer = (helper: HelperId) => {
    setPicker(null);
    setDrawer(helper);
    setPanelOpen(true);
  };

  // The chat: the Writer request edits the plan (2.4d) with Undo; other asks get a short acknowledgement.
  const undoWriter = () => {
    patch('writer', {
      description: AI_COACH_TEAM.writer.description,
      tone: undefined,
      state: undefined,
    });
    setOutputs((o) => o.filter((x) => x.id !== TIKTOK.id));
    setMessages((m) => [
      ...m.map((x) => ({ ...x, undo: false })),
      {
        id: `undone-${m.length}`,
        from: 'assistant',
        text: 'Undone. Writer is back to how it was, and the TikTok script is gone.',
      },
    ]);
  };
  const send = (text: string) => {
    setSuggestions((s) => s.filter((x) => x !== text));
    const n = messages.length;
    if (text === WRITER_ASK || /playful|tiktok/i.test(text)) {
      patch('writer', PLAYFUL_WRITER);
      setOutputs((o) =>
        o.some((x) => x.id === TIKTOK.id) ? o : [...o, TIKTOK]
      );
      setMessages((m) => [
        ...m,
        { id: `u-${n}`, from: 'user', text },
        { id: `a-${n}`, from: 'assistant', text: WRITER_DONE, undo: true },
      ]);
      return;
    }
    // Asking for Discord adds a helper: that flow is 2.5 "Add a helper".
    if (text === DISCORD_ASK || /discord/i.test(text)) {
      navigate(screenPath('2.5'));
      return;
    }
    const reply =
      "Got it. I'll fold that into the plan. Nothing runs until you press Start launch.";
    setMessages((m) => [
      ...m,
      { id: `u-${n}`, from: 'user', text },
      { id: `a-${n}`, from: 'assistant', text: reply },
    ]);
  };

  // Map: the full layout, or the compact one beside the drawer with everyone else faded.
  const layout = drawer ? AI_COACH_PLAN_COMPACT : AI_COACH_PLAN;
  const visible = (nodes: PlanNode[]) =>
    nodes.filter((n) => !removed.includes(n.id as HelperId));
  const nodes = visible(
    drawer
      ? planNodes(
          layout,
          { [drawer]: { selected: true } },
          { opacity: 0.5 },
          team
        )
      : picker
        ? planNodes(layout, { [picker]: {} }, { state: 'dimmed' }, team)
        : planNodes(layout, {}, {}, team)
  );
  const gates = layout.gates?.map((g) => ({ ...g, dimmed: !!drawer }));
  const pickerNode = picker ? nodes.find((n) => n.id === picker) : undefined;

  const draft = drawer ? toDraft(team[drawer]) : null;

  const aside =
    drawer && draft ? (
      <HelperDrawer
        key={drawer}
        helper={draft}
        onChange={(p) => patch(drawer, fromDraft(p))}
        onClose={() => {
          setDrawer(null);
          setPanelOpen(isDesktop());
        }}
        onRemove={() => {
          setRemoved((r) => [...r, drawer]);
          setDrawer(null);
          setPanelOpen(isDesktop());
        }}
        onDuplicate={() => navigate(screenPath('2.5'))}
        onAddFromSandbox={() => navigate(screenPath('2.6'))}
        onConnectTool={() => navigate(screenPath('2.7'))}
      />
    ) : panelOpen ? (
      <PlanChatPanel
        messages={messages.map((m) => ({
          ...m,
          extra: m.undo ? (
            <Button size="sm" onClick={undoWriter}>
              Undo
            </Button>
          ) : undefined,
        }))}
        suggestions={suggestions}
        onSend={send}
        tab={tab}
        onTabChange={(t) =>
          t === 'sandbox' ? navigate(screenPath('2.6')) : setTab(t)
        }
        onClose={() => setPanelOpen(false)}
      />
    ) : null;

  return (
    <AppShell sidebar="none" aside={aside}>
      <PlanTopBar
        panelOpen={panelOpen || drawer !== null}
        onTogglePanel={() => {
          if (drawer) {
            setDrawer(null);
            setPanelOpen(false);
          } else setPanelOpen((o) => !o);
        }}
      />
      <PlanCanvas
        key={drawer ? 'compact' : 'full'}
        layout={{ ...layout, gates }}
        nodes={nodes}
        outputs={outputs}
        outputsKey={outputs.map((o) => o.id).join()}
        zoomLabelBase={drawer ? 83 : 70}
        onNodeClick={(n) => openDrawer(n.id as HelperId)}
        onSettingClick={(n, label) => {
          if (label === 'Tools') {
            setDrawer(null);
            setPicker((p) => (p === n.id ? null : (n.id as HelperId)));
          } else openDrawer(n.id as HelperId);
        }}
        overlays={
          picker && pickerNode
            ? [
                {
                  id: 'tool-picker',
                  x: pickerNode.x + 150.45,
                  y: pickerNode.y + 84.857,
                  content: (
                    <ToolPicker
                      helper={team[picker].name}
                      selected={team[picker].tools ?? []}
                      scale={0.85}
                      onToggle={(tool) => {
                        const tools = team[picker].tools ?? [];
                        patch(picker, {
                          tools: tools.includes(tool)
                            ? tools.filter((t) => t !== tool)
                            : [...tools, tool],
                        });
                      }}
                      onConnect={() => navigate(screenPath('2.7'))}
                      onOpenFullEditor={() => openDrawer(picker)}
                      onClose={() => setPicker(null)}
                    />
                  ),
                },
              ]
            : undefined
        }
        focus={
          pickerNode
            ? { x: pickerNode.x + 200, y: pickerNode.y + 150 }
            : undefined
        }
      >
      </PlanCanvas>
    </AppShell>
  );
}

const WRITER_DONE =
  'Done. Writer is now playful, and I added a TikTok script to What goes out. Writer is the only helper that redoes its work.';

// Helper ⇄ drawer fields. Skills and files show as one Resources list.
function toDraft(h: Helper): HelperDraft {
  return {
    name: h.name,
    agent: h.agent,
    kind: h.kind ?? 'action',
    description: h.description,
    model: h.model,
    cost: modelCost(h),
    tools: h.tools,
    resources: [
      ...h.skills.map((name) => ({ name, type: 'Skill · how-to guide' })),
      ...h.files.map((name) => ({ name, type: 'File · from Sandbox' })),
    ],
    getsFrom: h.getsFrom,
    passesTo: h.passesTo,
    passes: h.passes,
    checks: h.checks,
  };
}

function fromDraft(p: Partial<HelperDraft>): Partial<Helper> {
  const { resources, ...rest } = p;
  const out: Partial<Helper> = {};
  for (const [k, v] of Object.entries(rest))
    if (k !== 'cost' && k !== 'passesTo')
      (out as Record<string, unknown>)[k] = v;
  if (resources) {
    out.skills = resources
      .filter((r) => r.type.startsWith('Skill'))
      .map((r) => r.name);
    out.files = resources
      .filter((r) => !r.type.startsWith('Skill'))
      .map((r) => r.name);
  }
  return out;
}
