import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { OutputItem } from '@/components/panels/OutputsCard';
import type { PanelTab } from '@/components/panels/PanelTabs';
import {
  AddStepPopover,
  type NewStep,
} from '@/components/planning/AddStepPopover';
import {
  HelperDrawer,
  type HelperDraft,
} from '@/components/planning/HelperDrawer';
import { PlanCanvas } from '@/components/planning/PlanCanvas';
import {
  PlanChatPanel,
  type PlanChatMessage,
} from '@/components/planning/PlanChatPanel';
import {
  edgeKey,
  insertStep,
  planRight,
} from '@/components/planning/planEdit';
import type { PlanEdge, PlanNode } from '@/components/planning/PlanMap';
import { PlanTopBar } from '@/components/planning/PlanTopBar';
import { ToolPicker } from '@/components/planning/ToolPicker';
import { AppShell } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/Button';
import { screenPath } from '@/screens/registry';

import {
  AI_COACH_OUTPUTS,
  AI_COACH_PLAN,
  AI_COACH_PLAN_COMPACT,
  AI_COACH_PLAN_WIDE,
  AI_COACH_TEAM,
  type Helper,
  modelCost,
  PLAN_CHAT_INTRO,
  PLAN_CHAT_SUGGESTIONS,
  planNodes,
} from './aiCoachPlan';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = ['2.3', '2.4', '2.4b', '2.4b-full', '2.4c', '2.4d'];

// Figma 2.3 "Proposed team" (2362:23641) and its editing states, one screen with real local state:
// - 2.4 "Edit a helper · drawer" (2362:23725): click a helper card → the helper drawer replaces the chat panel,
//   the map shrinks beside it and the other helpers fade.
// - 2.4b "Edit on the card" (2362:23869): click a card's Tools row → the tool picker opens on the card.
// - 2.4b-full "· full editor" (2362:27783): "Open full editor" → the drawer for that helper.
// - The Discord suggestion ("I also want to post on our Discord forum.") goes to 2.5 "Add a helper".
// - 2.4c "Add a step on a line" (2362:23969, hidden in Figma; an older layout with the chat as a 300px left column
//   and the map at full size): hover a connector → its "+" → the add-step popover; picking a step really inserts
//   it on that line (planEdit.insertStep), on every layout. 2.3 opens the same popover in place.
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

const DISCORD_POST: OutputItem = {
  id: 'discord',
  label: 'Discord post',
  type: 'post',
  isNew: true,
};

const isDesktop = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(min-width: 1280px)').matches;

export default function TeamMapScreen() {
  const navigate = useNavigate();
  const { id = '2.3' } = useParams();
  const byChat = id === '2.4d';

  const wide = id === '2.4c';
  const [team, setTeam] = useState<Record<string, Helper>>(() =>
    byChat
      ? {
          ...AI_COACH_TEAM,
          writer: { ...AI_COACH_TEAM.writer, ...PLAYFUL_WRITER },
        }
      : AI_COACH_TEAM
  );
  const [removed, setRemoved] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<string | null>(
    id === '2.4' ? 'strategist' : id === '2.4b-full' ? 'scout' : null
  );
  const [picker, setPicker] = useState<string | null>(
    id === '2.4b' ? 'scout' : null
  );
  const [panelOpen, setPanelOpen] = useState(
    () => isDesktop() || drawer !== null
  );
  const [tab, setTab] = useState<PanelTab>('chat');
  const [outputs, setOutputs] = useState<OutputItem[]>(
    byChat
      ? [...AI_COACH_OUTPUTS, TIKTOK]
      : wide
        ? // 2.4c (an earlier pass) already lists the Discord post.
          [...AI_COACH_OUTPUTS.slice(0, 3), DISCORD_POST, AI_COACH_OUTPUTS[3]]
        : AI_COACH_OUTPUTS
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
  // Steps added on a line, replayed onto whichever layout is drawn; and the line whose add-step popover is open.
  const [steps, setSteps] = useState<
    { edge: Pick<PlanEdge, 'from' | 'to'>; step: NewStep; id: string }[]
  >([]);
  const [adding, setAdding] = useState<{
    edge: Pick<PlanEdge, 'from' | 'to'>;
    at: { x: number; y: number };
  } | null>(() => {
    if (!wide) return null;
    const e = AI_COACH_PLAN_WIDE.edges.find((x) => x.addAt);
    return e?.addAt ? { edge: e, at: e.addAt } : null;
  });
  const [suggestions, setSuggestions] = useState(
    byChat ? [] : PLAN_CHAT_SUGGESTIONS
  );

  const patch = (helper: string, p: Partial<Helper>) =>
    setTeam((t) => ({ ...t, [helper]: { ...t[helper], ...p } }));

  const openDrawer = (helper: string) => {
    if (!team[helper]) return;
    setPicker(null);
    setAdding(null);
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

  const addStep = (step: NewStep) => {
    if (!adding) return;
    const stepId = `step-${steps.length + 1}`;
    setSteps((all) => [...all, { edge: adding.edge, step, id: stepId }]);
    if (step.type === 'helper')
      setTeam((t) => ({
        ...t,
        [stepId]: {
          name: step.name,
          kind: 'action',
          description: step.description,
          state: 'new',
          model: 'Haiku 5.5',
          tokensK: 2,
          skills: [],
          files: [],
          getsFrom: t[adding.edge.from]?.name ?? 'The step before',
          passesTo: t[adding.edge.to]?.name ?? 'the next step',
          passes: 'Its checked work',
          checks: 'Team default · when unsure',
        },
      }));
    setAdding(null);
  };

  // Map: the full layout, the compact one beside the drawer with everyone else faded, or 2.4c's full-size one;
  // plus any steps added on a line.
  const base = drawer
    ? AI_COACH_PLAN_COMPACT
    : wide
      ? AI_COACH_PLAN_WIDE
      : AI_COACH_PLAN;
  const layout = steps.reduce(
    (plan, st) => insertStep(plan, st.edge, st.step, st.id),
    base
  );
  const stageWidth = wide && !drawer ? 1062 : 954;
  const visible = (nodes: PlanNode[]) =>
    nodes.filter((n) => !removed.includes(n.id));
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
  const gates = layout.gates?.map((g) => ({
    ...g,
    dimmed: g.dimmed || !!drawer,
  }));
  const nameOf = (nodeId: string) =>
    team[nodeId]?.name ??
    (layout.gates?.some((g) => g.id === nodeId) ? 'the approval' : nodeId);
  const pickerNode = picker ? nodes.find((n) => n.id === picker) : undefined;

  const draft = drawer ? toDraft(team[drawer]) : null;

  const chatMessages = messages.map((m) => ({
    ...m,
    extra: m.undo ? (
      <Button size="sm" onClick={undoWriter}>
        Undo
      </Button>
    ) : undefined,
  }));

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
        onConnectTool={() => navigate(screenPath('2.7'))}
      />
    ) : panelOpen ? (
      <PlanChatPanel
        // 2.4c draws the chat as a left column on desktop; this panel is its overlay under 1280px.
        className={wide ? 'xl:hidden' : undefined}
        messages={chatMessages}
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
        // 2.4c's chat is a column, not the side panel, so its toggle isn't drawn Selected.
        panelOpen={(panelOpen && !wide) || drawer !== null}
        onTogglePanel={() => {
          if (drawer) {
            setDrawer(null);
            setPanelOpen(false);
          } else setPanelOpen((o) => !o);
        }}
      />
      <div className="flex min-h-px w-full flex-1">
        {wide && !drawer && panelOpen && (
          <PlanChatPanel
            variant="column"
            messages={chatMessages}
            suggestions={suggestions}
            onSend={send}
          />
        )}
        <PlanCanvas
          key={drawer ? 'compact' : wide ? 'wide' : 'full'}
          layout={{ ...layout, gates }}
          stageWidth={Math.max(stageWidth, planRight(layout) + 36)}
          onAddStep={(edge, at) => {
            setPicker(null);
            setAdding({ edge, at });
          }}
          addStepOn={adding ? edgeKey(adding.edge) : undefined}
          nodes={nodes}
          outputs={outputs}
          outputsKey={outputs.map((o) => o.id).join()}
          zoomLabelBase={drawer || wide ? 83 : 70}
          onNodeClick={(n) => openDrawer(n.id)}
          onSettingClick={(n, label) => {
            if (label === 'Tools') {
              setDrawer(null);
              setAdding(null);
              setPicker((p) => (p === n.id ? null : n.id));
            } else openDrawer(n.id);
          }}
          overlays={[
            ...(adding
              ? [
                  {
                    id: 'add-step',
                    // Figma 2.4c: the popover's corner is 22.3px right of and 94.9px above the "+" centre.
                    x: adding.at.x + 22.275 * layout.scale,
                    y: adding.at.y - 94.875 * layout.scale,
                    content: (
                      <AddStepPopover
                        from={nameOf(adding.edge.from)}
                        to={nameOf(adding.edge.to)}
                        scale={layout.scale}
                        onPick={addStep}
                        onClose={() => setAdding(null)}
                      />
                    ),
                  },
                ]
              : []),
            ...(picker && pickerNode
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
              : []),
          ]}
          focus={
            pickerNode
              ? { x: pickerNode.x + 200, y: pickerNode.y + 150 }
              : undefined
          }
        />
      </div>
    </AppShell>
  );
}

const WRITER_DONE =
  'Done. Writer is now playful, and I added a TikTok script to What goes out. Writer is the only helper that redoes its work.';

// Helper ⇄ drawer fields. Skills and files show as one Resources list.
const UPLOADED = 'File · uploaded';

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
      ...(h.uploads ?? []).map((name) => ({ name, type: UPLOADED })),
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
      .filter((r) => !r.type.startsWith('Skill') && r.type !== UPLOADED)
      .map((r) => r.name);
    out.uploads = resources
      .filter((r) => r.type === UPLOADED)
      .map((r) => r.name);
  }
  return out;
}
