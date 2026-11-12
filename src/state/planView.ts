import type { MiniMap } from '@/components/home/WorkflowCard';
import { insertStep } from '@/components/planning/planEdit';
import type { PlanEdge, PlanLayout } from '@/components/planning/PlanMap';
import {
  AI_COACH_PLAN,
  AI_COACH_PLAN_COMPACT,
  AI_COACH_PLAN_WIDE,
  AI_COACH_TEAM,
  type Helper,
  helperCard,
  PLAN_CHAT_SUGGESTIONS,
} from '@/screens/plan/aiCoachPlan';
import {
  COMMUNITY_PLAN,
  COMMUNITY_PLAN_COMPACT,
} from '@/screens/plan/communityPlan';

import type { Workflow } from './types';

// Selectors for the plan: the map layout from the team and your edits, and the estimate.

/**
 * Removes `gone` nodes from a list of lines, reconnecting each one's inputs to its outputs (a → X → b becomes
 * a → b, once). `merge` builds the new line from the two it replaces. Shared by the plan map and the run map.
 */
export function bridgeEdges<E extends { from: string; to: string }>(
  edges: E[],
  gone: Set<string>,
  merge: (into: E, out: E) => E
): E[] {
  let list = edges;
  for (const id of gone) {
    const into = list.filter((e) => e.to === id);
    const out = list.filter((e) => e.from === id);
    const rest = list.filter((e) => e.from !== id && e.to !== id);
    const has = new Set(rest.map((e) => `${e.from}>${e.to}`));
    for (const a of into)
      for (const b of out) {
        const k = `${a.from}>${b.to}`;
        if (a.from === b.to || has.has(k)) continue;
        has.add(k);
        rest.push(merge(a, b));
      }
    list = rest;
  }
  return list;
}

export type PlanVariant = 'full' | 'compact' | 'wide';

/**
 * The plan map for this workflow: the Figma layout for its team (with Community, it's 2.5's), every helper you added
 * (`withAdded`), and removed helpers taken out with their lines reconnected. Card content comes from the helpers: pass
 * `wf.helpers` to `planNodes` as the team.
 */
export function planLayout(wf: Workflow, variant: PlanVariant): PlanLayout {
  const community = !!wf.helpers.community;
  const base =
    variant === 'wide'
      ? AI_COACH_PLAN_WIDE
      : variant === 'compact'
        ? community
          ? COMMUNITY_PLAN_COMPACT
          : AI_COACH_PLAN_COMPACT
        : community
          ? COMMUNITY_PLAN
          : AI_COACH_PLAN;
  const inserted = withAdded(wf, base);
  // Helpers the base layout draws but this team doesn't have (Community on the 2.4c layout) go too.
  const gone = new Set([
    ...wf.removed,
    ...inserted.nodes.map((n) => n.id).filter((id) => !wf.helpers[id]),
  ]);
  if (!gone.size) return inserted;
  return {
    ...inserted,
    nodes: inserted.nodes.filter((n) => !gone.has(n.id)),
    edges: bridgeEdges<PlanEdge>(inserted.edges, gone, (into, out) => ({
      from: into.from,
      to: out.to,
      color: into.color,
    })),
  };
}

/**
 * Draws every helper you added that the base layout doesn't (helper/add, plan/insertStep):
 * - a step added on a line (planEdit.insertStep shifts the columns), once that line is on the map: a line into or out
 *   of a duplicate or another added step exists only after that one is placed, so edits are replayed until none is
 *   left that can go;
 * - a duplicate (3i, permissions/settings agent) in its original's column, under the lowest card there, with the
 *   original's lines in and out;
 * - anything else (Community on the 2.4c layout, a step whose line is gone) beside the helper that follows it in the
 *   team order (else the one before), the same way.
 */
function withAdded(wf: Workflow, base: PlanLayout): PlanLayout {
  let plan = base;
  const drawn = (id: string) => plan.nodes.some((n) => n.id === id);
  const hasEdge = (e: Pick<PlanEdge, 'from' | 'to'>) =>
    plan.edges.some((x) => x.from === e.from && x.to === e.to);
  let steps = wf.planSteps;
  let copies = wf.helperOrder.filter((h) => wf.helpers[h]?.copyOf && !drawn(h));
  for (;;) {
    const st = steps.find((x) => hasEdge(x.edge));
    if (st) {
      plan = insertStep(plan, st.edge, st.step, st.id);
      steps = steps.filter((x) => x !== st);
      continue;
    }
    const copy = copies.find((h) => drawn(wf.helpers[h].copyOf!));
    if (copy) {
      plan = beside(wf, plan, copy, wf.helpers[copy].copyOf!);
      copies = copies.filter((h) => h !== copy);
      continue;
    }
    break;
  }
  const order = wf.helperOrder;
  const live = (h: string) => drawn(h) && !wf.removed.includes(h);
  for (const [i, id] of order.entries()) {
    if (!wf.helpers[id] || wf.removed.includes(id) || drawn(id)) continue;
    const sibling =
      order.slice(i + 1).find(live) ?? order.slice(0, i).reverse().find(live);
    if (sibling) plan = beside(wf, plan, id, sibling);
  }
  return plan;
}

/** Adds helper `id` in `of`'s column, under the lowest card there, with `of`'s lines in and out. */
function beside(
  wf: Workflow,
  plan: PlanLayout,
  id: string,
  ofId: string
): PlanLayout {
  const of = plan.nodes.find((n) => n.id === ofId);
  if (!of) return plan;
  const s = plan.scale;
  const height = (h: string) =>
    (81.3 +
      21.87 *
        helperCard(wf.helpers[h] ?? AI_COACH_TEAM.writer).settings.length) *
    s;
  const column = plan.nodes.filter((n) => Math.abs(n.x - of.x) < 1);
  const bottom = Math.max(...column.map((n) => n.y + height(n.id)));
  return {
    ...plan,
    nodes: [
      ...plan.nodes,
      { ...of, ...helperCard(wf.helpers[id]), id, y: bottom + 24 * s },
    ],
    edges: [
      ...plan.edges,
      ...plan.edges
        .filter((e) => e.from === of.id || e.to === of.id)
        .map((e) => ({
          from: e.from === of.id ? id : e.from,
          to: e.to === of.id ? id : e.to,
          color: e.color,
        })),
    ],
  };
}

/**
 * Home's card preview of this workflow's own plan (a draft, a duplicate): its helpers as small boxes in their map
 * columns, with the lines between them, fitted to the 290×108 preview. An approval gate is where its lines meet.
 */
export function planMiniMap(wf: Workflow): MiniMap {
  const W = 290;
  const H = 108;
  const PAD = 12;
  const plan = planLayout(wf, 'full');
  // Columns: card x positions, merged when within a few px of each other.
  const xs = plan.nodes.map((n) => n.x).sort((a, b) => a - b);
  const columns: number[] = [];
  for (const x of xs)
    if (!columns.length || x - columns[columns.length - 1] > 4) columns.push(x);
  const column = (x: number) =>
    columns.reduce(
      (best, c, i) =>
        Math.abs(c - x) < Math.abs(columns[best] - x) ? i : best,
      0
    );
  const n = Math.max(1, columns.length);
  const perColumn = Math.max(
    1,
    ...columns.map(
      (_, i) => plan.nodes.filter((nd) => column(nd.x) === i).length
    )
  );
  const w = Math.min(44, (W - 2 * PAD - (n - 1) * 16) / n);
  const h = Math.min(18, (H - 2 * PAD) / perColumn - 4);
  const ys = plan.nodes.map((nd) => nd.y);
  const top = Math.min(...ys);
  const span = Math.max(...ys) - top;
  const cx = (i: number) =>
    n === 1 ? W / 2 : PAD + w / 2 + (i * (W - 2 * PAD - w)) / (n - 1);
  const cy = (y: number) =>
    span < 1 ? H / 2 : PAD + h / 2 + ((y - top) * (H - 2 * PAD - h)) / span;
  const at = new Map(
    plan.nodes.map((nd) => [nd.id, { x: cx(column(nd.x)), y: cy(nd.y) }])
  );
  // Ports: a box's right ('out') or left ('in') edge; a gate is a point between the boxes on either side of it.
  const port = (id: string, side: 'in' | 'out') => {
    const b = at.get(id);
    if (b) return { x: b.x + (side === 'out' ? w / 2 : -w / 2), y: b.y };
    if (!plan.gates?.some((g) => g.id === id)) return null;
    const ins = plan.edges.flatMap((e) =>
      e.to === id ? [at.get(e.from)] : []
    );
    const outs = plan.edges.flatMap((e) =>
      e.from === id ? [at.get(e.to)] : []
    );
    const left = Math.max(...ins.map((p) => (p ? p.x + w / 2 : -Infinity)));
    const right = Math.min(...outs.map((p) => (p ? p.x - w / 2 : Infinity)));
    if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
    const near = [...ins, ...outs].filter((p) => !!p);
    return {
      x: (left + right) / 2,
      y: near.reduce((sum, p) => sum + p.y, 0) / near.length,
    };
  };
  return {
    boxWidth: w,
    boxHeight: h,
    boxes: plan.nodes.map((nd) => ({ id: nd.id, ...at.get(nd.id)! })),
    lines: plan.edges.flatMap((e) => {
      const a = port(e.from, 'out');
      const b = port(e.to, 'in');
      if (!a || !b || b.x <= a.x) return [];
      return [{ x1: a.x, y1: a.y, x2: b.x, y2: b.y }];
    }),
  };
}

/** What a set of helpers costs per run before the multiplier (the drawer's rates: Haiku $0.005/k, Opus $0.01/k). */
export function rawCost(helpers: Pick<Helper, 'model' | 'tokensK'>[]) {
  return helpers.reduce(
    (sum, h) => sum + h.tokensK * (h.model === 'Opus 5.5' ? 0.01 : 0.005),
    0
  );
}

const BASE_TEAM = Object.values(AI_COACH_TEAM);
const BASE_TOKENS = BASE_TEAM.reduce((s, h) => s + h.tokensK, 0);
const BASE_COST = rawCost(BASE_TEAM);
/** Figma's estimate for the 2.3 team. */
const DRAWN_ESTIMATE = 'About 9 min · $0.30';

/** "About 9 min · $0.30": scaled from the 2.3 team by tokens (time) and model rates (cost). */
export function estimate(wf: Workflow) {
  if (wf.asDrawn) return DRAWN_ESTIMATE;
  const live = wf.helperOrder
    .filter((h) => wf.helpers[h] && !wf.removed.includes(h))
    .map((h) => wf.helpers[h]);
  const tokens = live.reduce((s, h) => s + h.tokensK, 0);
  const mins = Math.max(1, Math.round((9 * tokens) / BASE_TOKENS));
  const cost = (0.3 * rawCost(live)) / BASE_COST;
  return `About ${mins} min · $${cost.toFixed(2)}`;
}

/** The planning chat's suggestion chips, with today's helper names ("Make the Copywriter more playful…"). They
 *  show until you've asked something (2.4d has none). */
export function planSuggestions(wf: Workflow) {
  if (wf.planChat.some((m) => m.from === 'user')) return [];
  const writer = wf.helpers.writer;
  return PLAN_CHAT_SUGGESTIONS.flatMap((s, i) => {
    if (i === 0) return wf.helpers.community ? [] : [s];
    if (!writer || wf.removed.includes('writer')) return [];
    return [writer.name === 'Writer' ? s : s.replace('Writer', writer.name)];
  });
}
