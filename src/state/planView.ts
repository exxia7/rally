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
 * The plan map for this workflow: the Figma layout for its team (with Community, it's 2.5's), your inserted steps
 * (planEdit.insertStep shifts the columns), and removed helpers taken out with their lines reconnected. Card content
 * comes from the helpers: pass `wf.helpers` to `planNodes` as the team.
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
  const inserted = withCopies(
    wf,
    wf.planSteps.reduce(
      (plan, st) => insertStep(plan, st.edge, st.step, st.id),
      base
    )
  );
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
 * Duplicated helpers (3i, permissions/settings agent): each copy sits in its original's column, under the lowest card
 * there, with the original's lines in and out.
 */
function withCopies(wf: Workflow, plan: PlanLayout): PlanLayout {
  const copies = wf.helperOrder.filter(
    (h) => wf.helpers[h]?.copyOf && !plan.nodes.some((n) => n.id === h)
  );
  if (!copies.length) return plan;
  let nodes = plan.nodes;
  let edges = plan.edges;
  const s = plan.scale;
  const height = (id: string) =>
    (81.3 + 21.87 * helperCard(wf.helpers[id] ?? AI_COACH_TEAM.writer).settings.length) * s;
  for (const id of copies) {
    const of = nodes.find((n) => n.id === wf.helpers[id].copyOf);
    if (!of) continue;
    const column = nodes.filter((n) => Math.abs(n.x - of.x) < 1);
    const bottom = Math.max(...column.map((n) => n.y + height(n.id)));
    nodes = [
      ...nodes,
      { ...of, ...helperCard(wf.helpers[id]), id, y: bottom + 24 * s },
    ];
    edges = [
      ...edges,
      ...edges
        .filter((e) => e.from === of.id || e.to === of.id)
        .map((e) => ({
          from: e.from === of.id ? id : e.from,
          to: e.to === of.id ? id : e.to,
          color: e.color,
        })),
    ];
  }
  return { ...plan, nodes, edges };
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
