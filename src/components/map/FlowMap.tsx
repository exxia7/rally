import clsx from 'clsx';
import { useRef, type CSSProperties, type ReactNode } from 'react';

import { AgentAvatar, type AgentState } from '@/components/agents/AgentAvatar';
import type { AgentName } from '@/components/agents/characters';
import { useAdded, useChangedFrom, useGlide } from '@/lib/motion';
import { useAppState } from '@/state/store';

import { FORK_COLOR, type ForkNumber } from './forks';
import { HandoffMarker, type HandoffStatus } from './HandoffMarker';
import { NodeCard, type NodeCardData } from './NodeCard';
import { edgePath, forkLinePath, RUN_MAP_RADIUS as RADIUS } from './connectors';

// Run-map geometry, at the map scale the Figma frames use (connectors 1.383px, corners 9.223px,
// ports 7.378px, markers 18.446px, avatars 36.673px).
const STROKE = 1.38345;
const PORT_R = 3.68921;
const MARKER = 18.446;
const AVATAR = 36.673;
const DASH = 3.68921;
const DEFAULT_PORT_DY = 20.52;
// Fork lanes exist only in the docked frames (4.5, 6.5, 6.6), where Figma draws the map at 874/1282 and gives the
// fork line, its corners and the 5px fork handles round sizes at that scale.
const FORK_K = 874 / 1282;
const FORK_STROKE = 1.6 / FORK_K;
const FORK_RADIUS = 6 / FORK_K;
const HANDLE_R = 2.03 / FORK_K;
const HANDLE_STROKE = 0.94 / FORK_K;
const HANDLE_FILL_R = 2.5 / FORK_K;

export type MapNode = NodeCardData & {
  id: string;
  x: number;
  y: number;
  /** Port height below the card's top edge (connectors attach here). */
  portDy?: number;
  /** Floating helper character over the card's top-right corner. `at` overrides its map position and size
   *  (4.2 draws the reworking Strategist at 38.882px). */
  avatar?: {
    agent: AgentName;
    state?: AgentState;
    at?: { x: number; y: number; size: number };
  };
};

export type EdgeStatus = 'passed' | 'pending' | 'blocked';

export type MapEdge = {
  from: string;
  to: string;
  /** passed = solid blue, pending = dashed grey, blocked = thicker solid red (a handoff is missing something). */
  status?: EdgeStatus;
  /** Fork lane: draws the connector in the fork's colour. */
  fork?: ForkNumber;
  dimmed?: boolean;
  /** Absolute x of the vertical run. Default: one corner radius before the target. */
  lane?: number;
  /** Handoff marker on the source stub, `dx` px right of the source port. */
  marker?: {
    status: HandoffStatus;
    dx: number;
    dimmed?: boolean;
    /** Fork lanes draw their markers at 13px in the docked frame (19.069px here). */
    size?: number;
  };
  /** Corner radius of this connector (some fork-lane connectors are square: 0). */
  radius?: number;
  /** Fork-lane connector: small fork handles (drawn over the cards) instead of the 7.4px ports. */
  handles?: boolean;
};

// Figma "Fork line": joins a fork lane to the step it forked from. It leaves the parent path at (x, y), the handoff
// marker on the source's stub (or a point on a fork lane's vertical, for a fork from a fork), runs straight down and
// turns into each target's port. Passed = bold, in the fork's colour at 50%; pending (its input isn't ready yet) =
// the dashed grey connector with a square corner.
export type ForkLine = {
  fork: ForkNumber;
  x: number;
  y: number;
  to: string[];
  status?: 'passed' | 'pending';
};

export type MapOverlay = {
  id: string;
  x: number;
  y: number;
  content: ReactNode;
  /** Draw the content at another scale, from its top-left (fork pills and labels are sized for the docked map). */
  scale?: number;
};

const BLOCKED_STROKE = 1.84455;

// Motion (CLAUDE.md "Motion"): connectors interpolate to a new route; ports glide with them.
const routed = (d: string) => ({ d: `path("${d}")` }) as CSSProperties;
const isWorking = (n: MapNode) =>
  n.state === 'working' || n.avatar?.state === 'working';

const edgeColor = (e: MapEdge) => {
  if (e.fork) return FORK_COLOR[e.fork];
  if (e.status === 'blocked') return '#e5484d';
  if (e.status === 'pending') return e.dimmed ? '#e8e8eb' : '#cfd0d6';
  return e.dimmed ? '#ccd8f4' : '#91ade8';
};

// The run flowchart: free-placed node cards over an SVG connector layer, all driven by data so every
// run/rerun/fork screen renders its own variant. Coordinates are the Figma FlowMap frame's.
export function FlowMap({
  nodes,
  edges,
  overlays,
  forkLines,
  x,
  y,
  width,
  height,
  onNodeClick,
  onNodeRerun,
  className,
}: {
  /** Place the map on the canvas stage (absolute); omit to lay it out in flow. */
  x?: number;
  y?: number;
  nodes: MapNode[];
  edges: MapEdge[];
  overlays?: MapOverlay[];
  forkLines?: ForkLine[];
  width: number;
  height: number;
  onNodeClick?: (node: MapNode) => void;
  /** A card's own Rerun button (hand-raised cards with `showRerun`). */
  onNodeRerun?: (node: MapNode) => void;
  className?: string;
}) {
  // Motion memory for this workflow's map: a change the viewer saw animates, a direct load paints as drawn.
  const scope = `map:${useAppState().activeId}`;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ports = new Map<string, { x: number; y: number; color: string }>();
  // Fork handles, drawn over the cards like Figma's "Fork handle" ellipses.
  const handles = new Map<
    string,
    { x: number; y: number; color: string; opacity?: number }
  >();
  const lines = edges.flatMap((e) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) return [];
    const x1 = a.x + (a.width ?? 175.2);
    const y1 = a.y + (a.portDy ?? DEFAULT_PORT_DY);
    const x2 = b.x;
    const y2 = b.y + (b.portDy ?? DEFAULT_PORT_DY);
    const color = edgeColor(e);
    // A blocked line's ports stay the passed blue (Figma draws only the line red).
    const portColor =
      e.status === 'blocked' ? edgeColor({ ...e, status: 'passed' }) : color;
    for (const [x, y, side] of [
      [x1, y1, `${e.from}:out`],
      [x2, y2, `${e.to}:in`],
    ] as const) {
      const key = `${x.toFixed(2)},${y.toFixed(2)}`;
      if (e.handles) {
        if (!handles.has(key)) handles.set(key, { x, y, color: portColor });
        continue;
      }
      // Ports are keyed by their node side (one per position, as before), so a moved node's port glides.
      const portKey = side;
      // A port shared by a passed and a pending line takes the passed (blue) colour.
      if (!ports.has(portKey) || e.status !== 'pending')
        ports.set(portKey, { x, y, color: portColor });
    }
    // Work flowing: out of a working step, or out of a finished one into a step still waiting on it.
    const flow =
      !e.dimmed &&
      e.status !== 'blocked' &&
      b.state !== 'done' &&
      (isWorking(a) ||
        (e.status === 'passed' && a.state !== 'waiting' && b.state === 'waiting'));
    return [
      {
        e,
        x1,
        y1,
        x2,
        y2,
        color,
        flow,
        d: edgePath(x1, y1, x2, y2, e.lane ?? x2 - RADIUS, e.radius ?? RADIUS),
      },
    ];
  });

  // Cards, lines and helpers that appeared since this map was last on screen fade or pop in.
  const addedNodes = useAdded(
    `${scope}:nodes`,
    nodes.map((n) => n.id)
  );
  const addedEdges = useAdded(
    `${scope}:edges`,
    lines.map((l) => `${l.e.from}>${l.e.to}`)
  );
  const addedAvatars = useAdded(
    `${scope}:avatars`,
    nodes.filter((n) => n.avatar).map((n) => n.id)
  );

  const forks = (forkLines ?? []).map((f) => {
    const targets = f.to.flatMap((id) => {
      const n = byId.get(id);
      return n ? [{ x: n.x, y: n.y + (n.portDy ?? DEFAULT_PORT_DY) }] : [];
    });
    const pending = f.status === 'pending';
    for (const t of targets)
      handles.set(`${t.x.toFixed(2)},${t.y.toFixed(2)}`, {
        ...t,
        color: pending ? '#cfd0d6' : FORK_COLOR[f.fork],
        opacity: pending ? undefined : 0.5,
      });
    return {
      f,
      pending,
      d: forkLinePath(f.x, f.y, targets, pending ? 0 : FORK_RADIUS),
    };
  });

  return (
    <div
      className={className}
      style={{
        position: x === undefined ? 'relative' : 'absolute',
        left: x,
        top: y,
        width,
        height,
      }}
    >
      <svg
        width={width}
        height={height}
        overflow="visible"
        className="pointer-events-none absolute top-0 left-0"
        fill="none"
      >
        {/* Blocked lines are drawn last, over the lines they share a lane with. */}
        {[...lines]
          .sort(
            (a, b) =>
              Number(a.e.status === 'blocked') -
              Number(b.e.status === 'blocked')
          )
          .map(({ e, d, color, flow }) => (
            <Connector
              key={`${e.from}-${e.to}`}
              scope={scope}
              edge={e}
              d={d}
              color={color}
              flow={flow}
              isNew={addedEdges.has(`${e.from}>${e.to}`)}
            />
          ))}
        {forks.map(({ f, d, pending }) => (
          <path
            key={`f-${f.fork}-${f.x}-${f.y}`}
            d={d}
            stroke={pending ? '#cfd0d6' : FORK_COLOR[f.fork]}
            strokeOpacity={pending ? undefined : 0.5}
            strokeWidth={pending ? STROKE : FORK_STROKE}
            strokeDasharray={pending ? `${DASH} ${DASH}` : undefined}
          />
        ))}
        {[...ports.entries()].map(([key, p]) => (
          <circle
            key={key}
            cx={p.x}
            cy={p.y}
            className="pf-reroute"
            style={{ cx: p.x, cy: p.y } as CSSProperties}
            r={PORT_R}
            fill="white"
            stroke={p.color}
            strokeWidth={STROKE}
          />
        ))}
      </svg>
      {nodes.map((n) => (
        <MapCard
          key={n.id}
          scope={scope}
          node={n}
          isNew={addedNodes.has(n.id)}
          onClick={onNodeClick ? () => onNodeClick(n) : undefined}
          onRerun={onNodeRerun ? () => onNodeRerun(n) : undefined}
        />
      ))}
      {handles.size > 0 && (
        <svg
          width={width}
          height={height}
          overflow="visible"
          className="pointer-events-none absolute top-0 left-0"
          fill="none"
        >
          {[...handles.entries()].map(([key, h]) => (
            <g key={key}>
              <circle cx={h.x} cy={h.y} r={HANDLE_FILL_R} fill="white" />
              <circle
                cx={h.x}
                cy={h.y}
                r={HANDLE_R}
                stroke={h.color}
                strokeOpacity={h.opacity}
                strokeWidth={HANDLE_STROKE}
              />
            </g>
          ))}
        </svg>
      )}
      {lines
        .filter((l) => l.e.marker)
        .map(({ e, x1, y1 }) => (
          <MapMarker
            key={`m-${e.from}-${e.to}`}
            scope={scope}
            edge={e}
            x={x1 + e.marker!.dx - (e.marker!.size ?? MARKER) / 2}
            y={y1 - (e.marker!.size ?? MARKER) / 2}
          />
        ))}
      {nodes
        .filter((n) => n.avatar)
        .map((n) => (
          <MapAvatar
            key={`a-${n.id}`}
            scope={scope}
            node={n}
            isNew={addedAvatars.has(n.id)}
            {...(n.avatar!.at
              ? { x: n.avatar!.at.x, y: n.avatar!.at.y }
              : { x: n.x + (n.width ?? 175.2) - 30.07, y: n.y - 27.87 })}
          />
        ))}
      {overlays?.map((o) => (
        <div
          key={o.id}
          className="absolute origin-top-left"
          style={{
            left: o.x,
            top: o.y,
            transform: o.scale ? `scale(${o.scale})` : undefined,
          }}
        >
          {o.content}
        </div>
      ))}
    </div>
  );
}

// A connector. Pending lines stay still; a line out of a working step carries a travelling accent pulse (in the
// fork's colour on a fork lane); a handoff that completes while you watch draws from source to target; a new line
// fades in and a re-routed one interpolates to its new path. All of it is CSS (src/index.css), off under reduced
// motion.
function Connector({
  scope,
  edge: e,
  d,
  color,
  flow,
  isNew,
}: {
  scope: string;
  edge: MapEdge;
  d: string;
  color: string;
  flow: boolean;
  isNew: boolean;
}) {
  const key = `${scope}:edge:${e.from}>${e.to}`;
  const status = e.status ?? 'passed';
  const from = useChangedFrom(key, status);
  const draw = status === 'passed' && from !== undefined;
  const width = e.status === 'blocked' ? BLOCKED_STROKE : STROKE;
  return (
    <>
      <path
        key={draw ? 'drawn' : 'line'}
        d={d}
        style={routed(d)}
        className={clsx('pf-reroute', draw ? 'pf-draw' : isNew && 'pf-fade')}
        pathLength={draw ? 1 : undefined}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={e.status === 'pending' ? `${DASH} ${DASH}` : undefined}
        strokeDashoffset={e.status === 'pending' ? DASH / 2 : undefined}
      />
      {flow && (
        <path
          d={d}
          style={routed(d)}
          className="pf-flow pf-reroute"
          pathLength={1}
          stroke={e.fork ? FORK_COLOR[e.fork] : '#2457d6'}
          strokeWidth={width * 1.4}
          strokeLinecap="round"
        />
      )}
    </>
  );
}

// A step card on the map: its state cross-fades when it changes, a step inserted while you watch rises in, and a
// card that moves (a column added before it) glides to its new place.
function MapCard({
  scope,
  node: n,
  isNew,
  onClick,
  onRerun,
}: {
  scope: string;
  node: MapNode;
  isNew: boolean;
  onClick?: () => void;
  onRerun?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGlide(ref, n.x, n.y);
  return (
    <NodeCard
      {...n}
      ref={ref}
      motionKey={`${scope}:state:${n.id}`}
      className={clsx('absolute!', isNew && 'pf-rise')}
      onClick={onClick}
      onRerun={onRerun}
      style={{ left: n.x, top: n.y }}
    />
  );
}

// A step's helper over its card: thinking while it works, bouncing once when it raises its hand.
function MapAvatar({
  scope,
  node: n,
  isNew,
  x,
  y,
}: {
  scope: string;
  node: MapNode;
  isNew: boolean;
  x: number;
  y: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGlide(ref, x, y);
  return (
    <AgentAvatar
      ref={ref}
      motionKey={`${scope}:avatar-state:${n.id}`}
      appeared={isNew}
      agent={n.avatar!.agent}
      state={n.avatar!.state}
      size={n.avatar!.at?.size ?? AVATAR}
      className={clsx('absolute!', isNew && 'pf-pop')}
      style={{ left: x, top: y }}
    />
  );
}

// A handoff marker: the check pops in once the line into it has drawn.
function MapMarker({
  scope,
  edge: e,
  x,
  y,
}: {
  scope: string;
  edge: MapEdge;
  x: number;
  y: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGlide(ref, x, y);
  const m = e.marker!;
  const from = useChangedFrom(`${scope}:marker:${e.from}>${e.to}`, m.status);
  return (
    <HandoffMarker
      key={m.status}
      ref={ref}
      status={m.status}
      dimmed={m.dimmed}
      size={m.size ?? MARKER}
      className={clsx('absolute', from !== undefined && 'pf-pop')}
      style={{ left: x, top: y, ['--pf-delay' as string]: '260ms' }}
    />
  );
}
