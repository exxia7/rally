import type { ReactNode } from 'react';

import { AgentAvatar, type AgentState } from '@/components/agents/AgentAvatar';
import type { AgentName } from '@/components/agents/characters';

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
    for (const [x, y] of [
      [x1, y1],
      [x2, y2],
    ]) {
      const key = `${x.toFixed(2)},${y.toFixed(2)}`;
      if (e.handles) {
        if (!handles.has(key)) handles.set(key, { x, y, color: portColor });
        continue;
      }
      // A port shared by a passed and a pending line takes the passed (blue) colour.
      if (!ports.has(key) || e.status !== 'pending')
        ports.set(key, { x, y, color: portColor });
    }
    return [
      {
        e,
        x1,
        y1,
        x2,
        y2,
        color,
        d: edgePath(x1, y1, x2, y2, e.lane ?? x2 - RADIUS, e.radius ?? RADIUS),
      },
    ];
  });

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
          .map(({ e, d, color }) => (
            <path
              key={`${e.from}-${e.to}`}
              d={d}
              stroke={color}
              strokeWidth={e.status === 'blocked' ? BLOCKED_STROKE : STROKE}
              strokeDasharray={
                e.status === 'pending' ? `${DASH} ${DASH}` : undefined
              }
              strokeDashoffset={e.status === 'pending' ? DASH / 2 : undefined}
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
            r={PORT_R}
            fill="white"
            stroke={p.color}
            strokeWidth={STROKE}
          />
        ))}
      </svg>
      {nodes.map((n) => (
        <NodeCard
          key={n.id}
          {...n}
          nodeId={n.id}
          className="absolute!"
          onClick={onNodeClick ? () => onNodeClick(n) : undefined}
          onRerun={onNodeRerun ? () => onNodeRerun(n) : undefined}
          style={{ left: n.x, top: n.y }}
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
          <HandoffMarker
            key={`m-${e.from}-${e.to}`}
            status={e.marker!.status}
            dimmed={e.marker!.dimmed}
            size={e.marker!.size ?? MARKER}
            className="absolute"
            style={{
              left: x1 + e.marker!.dx - (e.marker!.size ?? MARKER) / 2,
              top: y1 - (e.marker!.size ?? MARKER) / 2,
            }}
          />
        ))}
      {nodes
        .filter((n) => n.avatar)
        .map((n) => (
          <AgentAvatar
            key={`a-${n.id}`}
            agent={n.avatar!.agent}
            state={n.avatar!.state}
            size={n.avatar!.at?.size ?? AVATAR}
            className="absolute!"
            style={
              n.avatar!.at
                ? { left: n.avatar!.at.x, top: n.avatar!.at.y }
                : { left: n.x + (n.width ?? 175.2) - 30.07, top: n.y - 27.87 }
            }
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
