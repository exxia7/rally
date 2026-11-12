import {
  cloneElement,
  createElement,
  isValidElement,
  type ReactElement,
} from 'react';

import type {
  ForkLine,
  MapEdge,
  MapNode,
  MapOverlay,
} from '@/components/map/FlowMap';
import { ForkLabel, ForkPill } from '@/components/map/Fork';
import type { ForkCardContent } from '@/components/panels/ForkCard';
import type { InspectorData } from '@/components/run/InspectorPanel';
import type { RunData, RunMap } from '@/components/run/RunScreenLayout';

import { type Branch, type BranchId, branchOfNode } from './branches';
import { ChosenVersionBadge } from './ChosenVersionBadge';

// Pure transforms of a run screen's RunData for its branches: rename a drawn fork to the name you gave it, add a lane
// for a fork no frame draws, mute the lanes you aren't looking at, badge the chosen version, and give every step an
// inline Fork card. Each returns its input untouched when there is nothing to do, so a frame as drawn stays exact.

// ---- Text swap (a drawn fork renamed) -----------------------------------------------------------------------

type Swap = [from: string, to: string];

function swapString(s: string, pairs: Swap[]) {
  return pairs.reduce((acc, [a, b]) => (a ? acc.split(a).join(b) : acc), s);
}

/** Every string in `value` (objects, arrays, React elements' props) with `pairs` swapped. */
export function swapText<T>(value: T, pairs: Swap[]): T {
  if (!pairs.length) return value;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return swapString(v, pairs);
    if (Array.isArray(v)) return v.map(walk);
    if (isValidElement(v)) {
      const el = v as ReactElement<Record<string, unknown>>;
      return cloneElement(el, walk(el.props) as Record<string, unknown>);
    }
    if (
      v &&
      typeof v === 'object' &&
      Object.getPrototypeOf(v) === Object.prototype
    )
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, walk(x)])
      );
    return v;
  };
  return walk(value) as T;
}

/** Name and brief swaps for drawn forks whose live branch (same colour) says something else. */
export function renameSwaps(drawn: Branch[], branches: Branch[]): Swap[] {
  const pairs: Swap[] = [];
  for (const d of drawn) {
    const live = branches.find((b) => b.id === d.id);
    if (!live) continue;
    if (d.brief && live.brief && d.brief !== live.brief)
      pairs.push([d.brief, live.brief]);
    if (live.name !== d.name) pairs.push([d.name, live.name]);
  }
  return pairs;
}

/** The run data with drawn forks renamed. */
export function renameRun(data: RunData, pairs: Swap[]): RunData {
  return pairs.length ? swapText(data, pairs) : data;
}

// ---- A lane for a fork no frame draws ---------------------------------------------------------------------

/** The docked map's width: overlays sized for the docked frame draw at map.width / 874. */
const DOCKED_W = 874;
const LANE_GAP = 70;
const LANE_H = 150;
const STAGE = { width: 1362, height: 830 };

/** Nodes downstream of `from` on its own branch (itself first), in map order. */
function laneFrom(map: RunMap, from: MapNode): MapNode[] {
  const branch = branchOfNode(from);
  const ids = new Set([from.id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const e of map.edges)
      if (ids.has(e.from) && !ids.has(e.to)) {
        const to = map.nodes.find((n) => n.id === e.to);
        if (to && branchOfNode(to) === branch) {
          ids.add(e.to);
          grew = true;
        }
      }
  }
  return map.nodes.filter((n) => ids.has(n.id));
}

const laneId = (id: string, n: number) => `${id.replace(/-f\d$/, '')}-f${n}`;

/**
 * Adds a lane for fork `b` (its `from` step and every step after it on that branch, copied below the map in the
 * fork's colour), joined by its fork line, with its Fork pill and label. The map is redrawn smaller if it no longer
 * fits the stage.
 */
export function withForkLane(data: RunData, b: Branch): RunData {
  const { map } = data;
  const from = map.nodes.find((n) => n.id === b.from);
  if (!b.fork || !from) return data;
  const fork = b.fork;
  const lane = laneFrom(map, from);
  const top = Math.min(...lane.map((n) => n.y));
  const base = map.height + LANE_GAP;
  const rename = new Map(lane.map((n) => [n.id, laneId(n.id, fork)]));
  const waitFor = from.agent ?? 'the first step';

  const nodes: MapNode[] = lane.map((n, i) => {
    const first = i === 0;
    const ready = /^ready/.test(n.id);
    return {
      ...n,
      id: rename.get(n.id)!,
      y: base + (n.y - top),
      fork,
      selected: false,
      flag: undefined,
      note: undefined,
      opacity: undefined,
      state: first ? 'working' : 'waiting',
      status: first
        ? { text: `Working on ${b.name}`, tone: 'live' }
        : { text: ready ? 'Waits for your OK' : `Waits for ${waitFor}` },
      avatar:
        first && n.agent
          ? {
              agent: n.agent as NonNullable<MapNode['avatar']>['agent'],
              state: 'working',
            }
          : undefined,
    };
  });
  const edges: MapEdge[] = map.edges
    .filter((e) => rename.has(e.from) && rename.has(e.to))
    .map((e) => ({
      ...e,
      from: rename.get(e.from)!,
      to: rename.get(e.to)!,
      status: 'pending',
      dimmed: false,
      handles: true,
      marker: e.marker && { ...e.marker, status: 'pending', dimmed: false },
    }));
  const port = from.portDy ?? 20;
  const s = map.width / DOCKED_W;
  const lineX = from.x - 24;
  const line: ForkLine = {
    fork,
    x: lineX,
    y: from.y + port,
    to: [nodes[0].id],
  };
  const overlays: MapOverlay[] = [
    {
      id: `fork-${fork}-pill`,
      x: lineX - 22 * s,
      y: (from.y + port + base) / 2,
      scale: s,
      content: createElement(ForkPill, { fork, label: b.name }),
    },
    {
      id: `fork-${fork}-label`,
      x: nodes[0].x,
      y: base - 22 * s,
      scale: s,
      content: createElement(ForkLabel, {
        fork,
        label: `${b.name} · running`,
      }),
    },
  ];
  const height = base + Math.max(...nodes.map((n) => n.y - base)) + LANE_H;
  return {
    ...data,
    map: refit({
      ...map,
      height,
      nodes: [...map.nodes, ...nodes],
      edges: [...map.edges, ...edges],
      forkLines: [...(map.forkLines ?? []), line],
      overlays: [...(map.overlays ?? []), ...overlays],
    }),
    inspectors: {
      ...data.inspectors,
      ...Object.fromEntries(nodes.map((n) => [n.id, laneInspector(n, b)])),
    },
  };
}

/** Fits a grown map on the stage, docked and full (as the fork frames' own placements do). */
function refit(map: RunMap): RunMap {
  const scaled = (maxW: number, room: number) =>
    Math.min(maxW, (room * map.width) / map.height);
  // Under the Tasks chip and the Branches row (16 + 40 + 6 + 40 + 10), above the agents bar.
  const top = 112;
  const room = STAGE.height - top - 72;
  const docked = scaled(DOCKED_W, room);
  const full = scaled(map.width, room);
  return {
    ...map,
    docked: { x: 43 + (DOCKED_W - docked) / 2, y: top, width: docked },
    full: { x: (STAGE.width - full) / 2, y: top, width: full },
  };
}

/** Inspector for a step on a generated lane: on that branch, in its colour, with its brief. */
function laneInspector(n: MapNode, b: Branch): InspectorData {
  return {
    eyebrow: n.kind[0].toUpperCase() + n.kind.slice(1),
    kindIcon: null,
    branch: b.name,
    branchFork: b.fork,
    title: n.title,
    meta: [n.agent, n.status?.text].filter(Boolean).join(' · '),
    preview: b.brief
      ? {
          eyebrow: `${b.name} brief`,
          quote: `“${b.brief}”`,
          fork: b.fork,
          action: null,
        }
      : undefined,
    fork: {
      description: `Try another direction from this step. ${b.name} stays as it is.`,
    },
    rerun: {
      description: 'Available once this step has run.',
      disabled: true,
    },
    fields: n.status ? [{ label: 'Status', value: n.status.text }] : [],
  };
}

// ---- Focus and the chosen version -------------------------------------------------------------------------

const MUTED = 0.4;

/**
 * Mutes every branch `muted` returns true for (cards faded, original lines dimmed, fork marks faded) and badges the
 * chosen branch's "Ready to post" with "Chosen version".
 */
export function viewBranches(
  data: RunData,
  muted: (id: BranchId) => boolean,
  chosen?: BranchId
): RunData {
  const { map } = data;
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const anyMuted = map.nodes.some((n) => muted(branchOfNode(n)));
  const ready = chosen
    ? map.nodes.find((n) => /^ready/.test(n.id) && branchOfNode(n) === chosen)
    : undefined;
  if (!anyMuted && !ready) return data;
  const s = map.width / DOCKED_W;
  const overlayBranch = (o: MapOverlay) => {
    const m = /^fork-(\d)-/.exec(o.id);
    return m ? `fork-${m[1]}` : null;
  };
  return {
    ...data,
    map: {
      ...map,
      nodes: map.nodes.map((n) =>
        muted(branchOfNode(n)) ? { ...n, opacity: MUTED, selected: false } : n
      ),
      edges: map.edges.map((e) => {
        const n = byId.get(e.from);
        if (!n || !muted(branchOfNode(n))) return e;
        return {
          ...e,
          dimmed: true,
          marker: e.marker && { ...e.marker, dimmed: true },
        };
      }),
      overlays: [
        ...(map.overlays ?? []).map((o) => {
          const b = overlayBranch(o);
          return b && muted(b)
            ? {
                ...o,
                content: createElement(
                  'div',
                  { style: { opacity: MUTED } },
                  o.content
                ),
              }
            : o;
        }),
        ...(ready
          ? [
              {
                id: 'chosen-version',
                x: ready.x,
                y: ready.y - 26 * s,
                scale: s,
                content: createElement(ChosenVersionBadge),
              },
            ]
          : []),
      ],
    },
  };
}

// ---- Inline Fork card (findings 3g and 1e) ----------------------------------------------------------------

/**
 * The inspector with a Fork card for "Fork from here" to open in place (instead of going to 6.1 or 6.6). Steps
 * that already have one (4.4, 6.4), can't fork (disabled or no action) or are being forked keep theirs.
 */
export function withInlineForkForm(
  insp: InspectorData,
  node: MapNode,
  map: RunMap,
  branchName: string
): InspectorData {
  if (insp.forkForm || !insp.fork || insp.fork.disabled) return insp;
  const helpers = [
    ...new Set(
      laneFrom(map, node)
        .map((n) => n.agent)
        .filter((a): a is string => !!a)
    ),
  ];
  const original = node.preview?.text ?? insp.preview?.quote ?? node.title;
  const form: ForkCardContent = {
    title: 'Fork from here',
    original: /^[“"]/.test(original) ? original : `“${original}”`,
    // The Launch copy steps keep the card's own chips (6.4); other steps start from a typed instruction.
    options: node.id.replace(/-f\d$/, '') === 'writer' ? undefined : [],
    note: `Earlier steps are reused. ${helpers.length} ${helpers.length === 1 ? 'helper works' : 'helpers work'} on a new branch · about 1 min. ${branchName === 'Original' ? 'The original path' : branchName} stays as it is.`,
    helpers,
  };
  return { ...insp, forkForm: form };
}
