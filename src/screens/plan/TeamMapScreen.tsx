import { sendPlanner } from '@/state/backend';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import type { OutputItem } from '@/components/map/OutputRow';
import type { PanelTab } from '@/components/panels/PanelTabs';
import {
  AddStepPopover,
  type NewStep,
} from '@/components/planning/AddStepPopover';
import {
  type DrawerField,
  HelperDrawer,
  type HelperDraft,
} from '@/components/planning/HelperDrawer';
import {
  type AskLevel,
  PermissionPicker,
} from '@/components/planning/PermissionPicker';
import { PlanCanvas } from '@/components/planning/PlanCanvas';
import { MapPopover } from '@/components/planning/MapPopoverHost';
import { PlanChatPanel } from '@/components/planning/PlanChatPanel';
import { edgeKey, planRight } from '@/components/planning/planEdit';
import type { PlanEdge, PlanNode } from '@/components/planning/PlanMap';
import { PlanTopBar, runStarted } from '@/components/planning/PlanTopBar';
import { ToolPicker } from '@/components/planning/ToolPicker';
import { TOOLS } from '@/components/planning/tools';
import { useConnectTool } from '@/components/planning/useConnectTool';
import { AppShell } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/Button';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { useGo } from '@/state/nav';
import {
  CHECK_TEAM_DEFAULT,
  checksLabel,
  helperAsk,
  isPoster,
  missingTools,
  pickerAsk,
  toolConnected,
  withPermissionRows,
} from '@/state/permissions';
import { planLayout, planSuggestions } from '@/state/planView';
import { PLAYFUL_WRITER, TIKTOK_OUTPUT, WRITER_DONE } from '@/state/scenes';
import { dispatch, useAppState } from '@/state/store';
import type { ChatLine, Output, UndoRef } from '@/state/types';

import {
  AI_COACH_PLAN_WIDE,
  AI_COACH_TEAM,
  type Helper,
  modelCost,
  PLAN_CHAT_LIVE,
  PLAN_CHAT_START,
  PLAN_CHAT_SUGGESTIONS,
  planNodes,
} from './aiCoachPlan';
import { COMMUNITY, communityChat, DISCORD_OUTPUT } from './communityPlan';
import { useScreenId } from '@/screens/screenId';

// eslint-disable-next-line react-refresh/only-export-components -- App.tsx reads screenId from every screen module
export const screenId = [
  '2.3',
  '2.4',
  '2.4b',
  '2.4b-full',
  '2.4c',
  '2.4d',
  '2.4e',
  '2.5',
];

// The planning map with the Chat panel, one screen for every Figma frame that shows it, all views of the store's
// workflow (helpers, removed, steps added on a line, outputs, the planning chat, permissions):
// - 2.3 "Proposed team" (2362:23641): the team as the Planner proposed it.
// - 2.4 "Edit a helper · drawer" (2362:23725) and 2.4b-full (2362:27783): click a card → that helper's drawer replaces
//   the chat, the map shrinks beside it and the others fade. Every field writes to the store (name, model, tools…),
//   so the card, the estimate, the chat's suggestions and the run follow. Remove, Duplicate ("<Name> copy" under the
//   original, its drawer open) and Connect a tool (the connect step, then back here) work in place.
// - 2.4b "Edit on the card" (2362:23869): a card's Tools row → the tool picker on the card.
// - 2.4c "Add a step on a line" (2362:23969): hover a line → "+" → the add-step popover inserts a step.
// - 2.4d "Edit by chat" (2362:24093): "Make the Writer more playful…" edits the Writer and What goes out, with Undo.
// - 2.5 "Add a helper" (2362:24186): "I also want to post on our Discord forum." adds Community (with Undo).
// - 2.4e "Ask before a step runs" (2362:27674): a poster's Posts/Ads row → its "Before … runs" picker. It's the same
//   setting as the drawer's "Checks with you" (src/state/permissions.ts).
// Sandbox swaps to the Sandbox screen (2.6/2.7) on the same workflow; a card clicked there opens its drawer here.

const isDesktop = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(min-width: 1280px)').matches;

const GENERIC_REPLY =
  "Got it. I'll fold that into the plan. Nothing runs until you press Start launch.";
// Not in Figma: once the run has started, nothing waits for Start launch (the intro says so too).
const GENERIC_REPLY_LIVE =
  "Got it. I'll apply that to the steps that haven't started yet.";

const PICKER_REPLY: Record<AskLevel, (name: string) => string> = {
  'ask-first': (n) => `${n} will wait for your OK before it posts or spends.`,
  'spends-money': (n) =>
    `${n} will post on schedule and ask before any ad spend.`,
  'just-go': (n) =>
    `${n} will run without asking. Workspace rules still apply.`,
};

const initialDrawer = (id: string, state: unknown): string | null => {
  const asked = (state as { drawer?: string } | null)?.drawer;
  if (asked) return asked;
  return id === '2.4' ? 'strategist' : id === '2.4b-full' ? 'scout' : null;
};

export default function TeamMapScreen() {
  const go = useGo();
  const location = useLocation();
  const id = useScreenId() ?? '2.3';
  const s = useAppState();
  const wf = s.workflows[s.activeId];
  const team = wf.helpers;
  const wide = id === '2.4c';
  const check = wf.permissions.checkLevel;
  // A direct load of a planning frame is always before the run, so this never changes Figma's text.
  const liveRun = runStarted(wf);

  const [drawer, setDrawer] = useState<string | null>(() =>
    initialDrawer(id, location.state)
  );
  const [picker, setPicker] = useState<string | null>(
    id === '2.4b' ? 'scout' : null
  );
  const [askPicker, setAskPicker] = useState<string | null>(
    id === '2.4e' ? 'publisher' : null
  );
  const [panelOpen, setPanelOpen] = useState(
    () => isDesktop() || drawer !== null
  );
  const [tab, setTab] = useState<PanelTab>('chat');
  const [adding, setAdding] = useState<{
    edge: Pick<PlanEdge, 'from' | 'to'>;
    at: { x: number; y: number };
  } | null>(() => {
    if (!wide) return null;
    const e = AI_COACH_PLAN_WIDE.edges.find((x) => x.addAt);
    return e?.addAt ? { edge: e, at: e.addAt } : null;
  });
  const [connectDialog, connect] = useConnectTool();

  const askRef = useRef<HTMLDivElement>(null);
  const askRefs = useMemo(() => [askRef], []);
  const closeAsk = useCallback(() => setAskPicker(null), []);
  useOutsideClick(askRefs, askPicker !== null, closeAsk);

  const live = (h: string) => !!team[h] && !wf.removed.includes(h);
  const patch = (helper: string, p: Partial<Helper>) =>
    dispatch({ type: 'helper/patch', id: helper, patch: p });
  const say = (lines: ChatLine[]) =>
    dispatch({ type: 'planChat/append', lines, clearUndo: true });
  const n = wf.planChat.length;

  // The drawer field a card click asked for (its "Edit Model" row, the card itself); a new key asks again.
  const [drawerFocus, setDrawerFocus] = useState<
    { field: DrawerField; key: number } | undefined
  >();
  const openDrawer = (helper: string, field?: DrawerField) => {
    if (!live(helper)) return;
    setPicker(null);
    setAskPicker(null);
    setAdding(null);
    setDrawer(helper);
    setPanelOpen(true);
    // A click on the card whose drawer is open (or on one of its rows) goes to that field.
    setDrawerFocus((f) =>
      field || helper === drawer
        ? { field: field ?? 'name', key: (f?.key ?? 0) + 1 }
        : undefined
    );
  };
  const closeDrawer = () => {
    setDrawer(null);
    setPanelOpen(isDesktop());
  };

  // ---- Chat --------------------------------------------------------------------------------------------------

  const writerName = team.writer?.name ?? 'Writer';
  const setOutputs = (outputs: Output[]) =>
    dispatch({ type: 'outputs/set', outputs });

  const undo = (u: UndoRef) => {
    if (u.kind === 'remove') {
      dispatch({ type: 'helper/restore', id: u.helper });
    } else if (u.kind === 'playful') {
      patch('writer', {
        description: AI_COACH_TEAM.writer.description,
        tone: undefined,
        state: undefined,
      });
      setOutputs(wf.outputs.filter((o) => o.id !== TIKTOK_OUTPUT.id));
      say([
        {
          id: `undone-${n}`,
          from: 'assistant',
          text: `Undone. ${writerName} is back to how it was, and the TikTok script is gone.`,
        },
      ]);
    } else {
      dispatch({ type: 'helper/delete', id: 'community' });
      setAskPicker((p) => (p === 'community' ? null : p));
      say([
        {
          id: `undone-${n}`,
          from: 'assistant',
          text: 'Undone. No Community helper, and Discord post is off What goes out.',
        },
      ]);
    }
  };

  const send = (text: string) => {
    if (wf.backend) { void sendPlanner(wf.id, text); return; }
    if (live('writer') && /playful|tiktok/i.test(text)) {
      patch('writer', PLAYFUL_WRITER);
      if (!wf.outputs.some((o) => o.id === TIKTOK_OUTPUT.id))
        setOutputs([...wf.outputs, TIKTOK_OUTPUT]);
      say([
        { id: `u-${n}`, from: 'user', text },
        {
          id: `a-${n}`,
          from: 'assistant',
          text: WRITER_DONE.split('Writer').join(writerName),
          undo: { kind: 'playful' },
        },
      ]);
      return;
    }
    if (!team.community && /discord/i.test(text)) {
      // Asking for Discord adds a Community helper above Publisher, and a Discord post to What goes out (2.5).
      dispatch({
        type: 'helper/add',
        id: 'community',
        helper: COMMUNITY,
        before: live('publisher') ? 'publisher' : undefined,
      });
      const discord: Output = {
        ...DISCORD_OUTPUT,
        owner: 'community',
        channel: 'Discord',
      };
      const at = wf.outputs.findIndex((o) => o.id === 'email');
      setOutputs(
        at < 0
          ? [...wf.outputs, discord]
          : [...wf.outputs.slice(0, at), discord, ...wf.outputs.slice(at)]
      );
      say(communityChat(n, text));
      return;
    }
    say([
      { id: `u-${n}`, from: 'user', text },
      {
        id: `a-${n}`,
        from: 'assistant',
        text: liveRun ? GENERIC_REPLY_LIVE : GENERIC_REPLY,
      },
    ]);
  };

  // ---- Helpers: duplicate, add a step, tools, permissions -----------------------------------------------------

  const duplicate = (helper: string) => {
    const h = team[helper];
    if (!h) return;
    let copyId = `${helper}-copy`;
    for (let i = 2; team[copyId]; i++) copyId = `${helper}-copy-${i}`;
    const at = wf.helperOrder.indexOf(helper);
    dispatch({
      type: 'helper/add',
      id: copyId,
      helper: {
        ...h,
        name: `${h.name} copy`,
        state: 'new',
        selected: undefined,
        copyOf: h.copyOf ?? helper,
      },
      before: wf.helperOrder[at + 1],
    });
    say([
      {
        id: `copy-${n}`,
        from: 'assistant',
        text: `Added ${h.name} copy next to ${h.name}, with the same setup and lines. Rename it or change what it does.`,
      },
    ]);
    setDrawer(copyId);
  };

  const addStep = (step: NewStep) => {
    if (!adding) return;
    const stepId = `step-${wf.planSteps.length + 1}`;
    dispatch({
      type: 'plan/insertStep',
      edit: { edge: adding.edge, step, id: stepId },
      helper:
        step.type === 'helper'
          ? {
              name: step.name,
              kind: 'action',
              description: step.description,
              state: 'new',
              model: 'Haiku 5.5',
              tokensK: 2,
              skills: [],
              files: [],
              getsFrom: team[adding.edge.from]?.name ?? 'The step before',
              passesTo: team[adding.edge.to]?.name ?? 'the next step',
              passes: 'Its checked work',
              checks: checksLabel('default', check),
            }
          : undefined,
    });
    setAdding(null);
  };

  const toggleTool = (helper: string, tool: string) => {
    const tools = team[helper].tools ?? [];
    patch(helper, {
      tools: tools.includes(tool)
        ? tools.filter((t) => t !== tool)
        : [...tools, tool],
    });
  };
  // The connect step, then back here with the new tool given to this helper.
  const connectFor = (helper: string) =>
    connect(undefined, (name) => {
      const tool = name === 'Email (Resend)' ? 'Email' : name;
      const tools = team[helper]?.tools;
      if (tools && !tools.includes(tool) && TOOLS.some((t) => t.name === tool))
        patch(helper, { tools: [...tools, tool] });
    });
  // Figma draws every connected tool as "Connected"; once you've changed something, the workspace's flag shows.
  const toolSource = wf.asDrawn
    ? undefined
    : (name: string) => {
        const t = TOOLS.find((x) => x.name === name);
        return t?.source === 'Connected' && !toolConnected(s, name)
          ? 'Not connected'
          : (t?.source ?? 'Built in');
      };

  const chooseAsk = (helper: string, level: AskLevel) => {
    const h = team[helper];
    if (!h) return;
    patch(helper, { checks: checksLabel(level, check, h.checks) });
    say([
      {
        id: `ask-level-${n}`,
        from: 'assistant',
        text: PICKER_REPLY[level](h.name),
      },
    ]);
  };

  // ---- The map ---------------------------------------------------------------------------------------------------

  const layout = planLayout(wf, drawer ? 'compact' : wide ? 'wide' : 'full');
  // Cards: poster rows follow each helper's permission.
  const cardTeam = useMemo(() => {
    const out: Record<string, Helper> = {};
    for (const [hid, h] of Object.entries(team))
      out[hid] = withPermissionRows(wf, hid, h);
    return out;
  }, [team, wf]);
  const stageWidth = wide && !drawer ? 1062 : 954;
  // After the first edit, a tool the workspace hasn't connected reads amber with a lock in the card's Tools row;
  // clicking it opens the connect step on that tool. Figma draws every tool as connected, so direct loads don't.
  const withToolAlerts = (list: PlanNode[]): PlanNode[] =>
    wf.asDrawn
      ? list
      : list.map((node) => {
          const missing = missingTools(s, team[node.id]);
          return missing.length
            ? {
                ...node,
                settings: node.settings.map((r) =>
                  r.label === 'Tools'
                    ? { ...r, alert: missing, onAlertClick: (t) => connect(t) }
                    : r
                ),
              }
            : node;
        });
  const nodes: PlanNode[] = withToolAlerts(drawer
    ? planNodes(
        layout,
        { [drawer]: { selected: true } },
        { opacity: 0.5 },
        cardTeam
      )
    : picker
      ? planNodes(layout, { [picker]: {} }, { state: 'dimmed' }, cardTeam)
      : askPicker
        ? planNodes(
            layout,
            { [askPicker]: { selected: 'accent' } },
            // Faded, but a New card keeps its badge and dashed border.
            { opacity: 0.4 },
            cardTeam
          )
        : planNodes(layout, {}, {}, cardTeam));
  const gates = layout.gates?.map((g) => ({
    ...g,
    dimmed: g.dimmed || !!drawer,
  }));
  const nameOf = (nodeId: string) =>
    team[nodeId]?.name ??
    (layout.gates?.some((g) => g.id === nodeId) ? 'the approval' : nodeId);
  const pickerNode = picker ? nodes.find((x) => x.id === picker) : undefined;
  const askNode = askPicker ? nodes.find((x) => x.id === askPicker) : undefined;
  const asker = askPicker ? team[askPicker] : undefined;

  const chatMessages = wf.planChat.map((m) => ({
    ...m,
    text:
      liveRun && m.from === 'assistant'
        ? m.text.replace(PLAN_CHAT_START, PLAN_CHAT_LIVE)
        : m.text,
    extra: m.undo ? (
      <Button
        size="sm"
        className={m.undo.kind === 'community' ? 'w-[57px]' : undefined}
        onClick={() => undo(m.undo!)}
      >
        Undo
      </Button>
    ) : undefined,
  }));
  const suggestions = planSuggestions(wf).filter(
    (x) => !(team.community && x === PLAN_CHAT_SUGGESTIONS[0])
  );

  const helper = drawer && live(drawer) ? team[drawer] : null;
  const aside =
    drawer && helper ? (
      <HelperDrawer
        key={drawer}
        helper={{
          ...toDraft(helper),
          checks:
            helperAsk(helper) === 'default'
              ? checksLabel('default', check)
              : helper.checks,
        }}
        checksOptions={[
          checksLabel('default', check),
          checksLabel('ask-first', check, helper.checks),
          checksLabel('spends-money', check),
          checksLabel('just-go', check),
        ]}
        toolSource={toolSource}
        focus={drawerFocus}
        onChange={(p) => patch(drawer, fromDraft(p))}
        onClose={closeDrawer}
        onRemove={() => {
          dispatch({ type: 'helper/remove', id: drawer });
          closeDrawer();
        }}
        onDuplicate={() => duplicate(drawer)}
        onConnectTool={() => connectFor(drawer)}
      />
    ) : panelOpen ? (
      <PlanChatPanel
        // 2.4c draws the chat as a left column on desktop; this panel is its overlay under 1280px.
        className={wide ? 'xl:hidden' : undefined}
        messages={chatMessages}
        typing={wf.backend?.planning}
        suggestions={suggestions}
        onSend={send}
        tab={tab}
        onTabChange={(t) =>
          t === 'sandbox' ? go('2.6', { replace: true }) : setTab(t)
        }
        onClose={() => setPanelOpen(false)}
      />
    ) : null;

  return (
    <AppShell aside={aside}>
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
        typing={wf.backend?.planning}
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
            setAskPicker(null);
            setAdding({ edge, at });
          }}
          addStepOn={adding ? edgeKey(adding.edge) : undefined}
          nodes={nodes}
          outputs={wf.outputs as OutputItem[]}
          onOutputsChange={(items) =>
            setOutputs(
              items.map((i) => wf.outputs.find((o) => o.id === i.id) ?? i)
            )
          }
          onNodeClick={(node) => openDrawer(node.id)}
          // "You approve" holds Publisher until you say yes: open Publisher, where "Checks with you" sets it.
          onGateClick={() => openDrawer('publisher')}
          onSettingClick={(node, label) => {
            if (label === 'Tools') {
              setDrawer(null);
              setAdding(null);
              setAskPicker(null);
              setPicker((p) => (p === node.id ? null : node.id));
            } else if (
              (label === 'Posts' || label === 'Ads') &&
              isPoster(wf, node.id)
            ) {
              setPicker(null);
              setAdding(null);
              setDrawer(null);
              setAskPicker((p) => (p === node.id ? null : node.id));
            } else
              openDrawer(
                node.id,
                label === 'Model'
                  ? 'model'
                  : label === 'Skills' || label === 'Files'
                    ? 'resources'
                    : undefined
              );
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
                      // Drawn at 1:1 outside the scaled map: the component's sizes are Figma's at map scale 0.825.
                      <MapPopover>
                        <AddStepPopover
                          from={nameOf(adding.edge.from)}
                          to={nameOf(adding.edge.to)}
                          scale={1 / 0.825}
                          onPick={addStep}
                          onClose={() => setAdding(null)}
                        />
                      </MapPopover>
                    ),
                  },
                ]
              : []),
            ...(picker && pickerNode && team[picker]
              ? [
                  {
                    id: 'tool-picker',
                    x: pickerNode.x + 150.45,
                    y: pickerNode.y + 84.857,
                    content: (
                      <MapPopover>
                        <ToolPicker
                          helper={team[picker].name}
                          selected={team[picker].tools ?? []}
                          toolSource={toolSource}
                          onToggle={(tool) => toggleTool(picker, tool)}
                          onConnect={() => connectFor(picker)}
                          onOpenFullEditor={() => openDrawer(picker)}
                          onClose={() => setPicker(null)}
                        />
                      </MapPopover>
                    ),
                  },
                ]
              : []),
            ...(askPicker && askNode && asker
              ? [
                  {
                    id: 'permission-picker',
                    // Its right edge 10px left of the card.
                    x: askNode.x - 10,
                    y: Math.max(8, askNode.y - 121.57),
                    content: (
                      <MapPopover align="end">
                        <div ref={askRef}>
                          <PermissionPicker
                            helper={asker.name}
                            summary={
                              askPicker === 'publisher'
                                ? `${asker.name} posts for you and can spend up to $${wf.permissions.adLimit} on ads.`
                                : `${asker.name} posts your launch in Discord.`
                            }
                            value={pickerAsk(asker)}
                            teamDefault={CHECK_TEAM_DEFAULT[check]}
                            onChange={(level) => chooseAsk(askPicker, level)}
                            onPermissions={() =>
                              go('2.7', { returnHere: true })
                            }
                          />
                        </div>
                      </MapPopover>
                    ),
                  },
                ]
              : []),
          ]}
          focus={
            pickerNode
              ? { x: pickerNode.x + 200, y: pickerNode.y + 150 }
              : askNode
                ? { x: askNode.x - 140, y: askNode.y + 160 }
                : undefined
          }
        />
      </div>
      {connectDialog}
    </AppShell>
  );
}

// Helper ⇄ drawer fields. Skills and files show as one Resources list.
const UPLOADED = 'File · uploaded';

function toDraft(h: Helper): HelperDraft {
  return {
    name: h.name,
    agent: h.agent,
    kind: h.kind ?? 'action',
    description: h.instructions ?? h.description,
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
