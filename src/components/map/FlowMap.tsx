import type { ReactNode } from 'react';

import { AgentAvatar, type AgentState } from '@/components/agents/AgentAvatar';
import type { AgentName } from '@/components/agents/characters';

import { FORK_COLOR, type ForkNumber } from './forks';
import { HandoffMarker, type HandoffStatus } from './HandoffMarker';
import { NodeCard, type NodeCardData } from './NodeCard';
import { edgePath, RUN_MAP_RADIUS as RADIUS } from './connectors';

// Run-map geometry, at the map scale the Figma frames use (connectors 1.383px, corners 9.223px,
// ports 7.378px, markers 18.446px, avatars 36.673px).
const STROKE = 1.38345;
const PORT_R = 3.68921;
const MARKER = 18.446;
const AVATAR = 36.673;
const DASH = 3.68921;
const DEFAULT_PORT_DY = 20.52;

export type MapNode = NodeCardData & {
  id: string;
  x: number;
  y: number;
  /** Port height below the card's top edge (connectors attach here). */
  portDy?: number;
  /** Floating helper character over the card's top-right corner. */
  avatar?: { agent: AgentName; state?: AgentState };
};

export type EdgeStatus = 'passed' | 'pending';

export type MapEdge = {
  from: string;
  to: string;
  /** passed = solid blue, pending = dashed grey. */
  status?: EdgeStatus;
  /** Fork lane: draws the connector in the fork's colour. */
  fork?: ForkNumber;
  dimmed?: boolean;
  /** Absolute x of the vertical run. Default: one corner radius before the target. */
  lane?: number;
  /** Handoff marker on the source stub, `dx` px right of the source port. */
  marker?: { status: HandoffStatus; dx: number; dimmed?: boolean };
};

export type MapOverlay = {
  id: string;
  x: number;
  y: number;
  content: ReactNode;
};

const edgeColor = (e: MapEdge) => {
  if (e.fork) return FORK_COLOR[e.fork];
  if (e.status === 'pending') return e.dimmed ? '#e8e8eb' : '#cfd0d6';
  return e.dimmed ? '#ccd8f4' : '#91ade8';
};

// The run flowchart: free-placed node cards over an SVG connector layer, all driven by data so every
// run/rerun/fork screen renders its own variant. Coordinates are the Figma FlowMap frame's.
export function FlowMap({
  nodes,
  edges,
  overlays,
  x,
  y,
  width,
  height,
  onNodeClick,
  className,
}: {
  /** Place the map on the canvas stage (absolute); omit to lay it out in flow. */
  x?: number;
  y?: number;
  nodes: MapNode[];
  edges: MapEdge[];
  overlays?: MapOverlay[];
  width: number;
  height: number;
  onNodeClick?: (node: MapNode) => void;
  className?: string;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ports = new Map<string, { x: number; y: number; color: string }>();
  const lines = edges.flatMap((e) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) return [];
    const x1 = a.x + (a.width ?? 175.2);
    const y1 = a.y + (a.portDy ?? DEFAULT_PORT_DY);
    const x2 = b.x;
    const y2 = b.y + (b.portDy ?? DEFAULT_PORT_DY);
    const color = edgeColor(e);
    for (const [x, y] of [
      [x1, y1],
      [x2, y2],
    ]) {
      const key = `${x.toFixed(2)},${y.toFixed(2)}`;
      // A port shared by a passed and a pending line takes the passed (blue) colour.
      if (!ports.has(key) || e.status !== 'pending')
        ports.set(key, { x, y, color });
    }
    return [
      {
        e,
        x1,
        y1,
        x2,
        y2,
        color,
        d: edgePath(x1, y1, x2, y2, e.lane ?? x2 - RADIUS),
      },
    ];
  });

  return (
    <div className={className} style={{
        position: x === undefined ? 'relative' : 'absolute',
        left: x,
        top: y,
        width,
        height,
      }}>
      <svg
        width={width}
        height={height}
        overflow="visible"
        className="pointer-events-none absolute top-0 left-0"
        fill="none"
      >
        {lines.map(({ e, d, color }) => (
          <path
            key={`${e.from}-${e.to}`}
            d={d}
            stroke={color}
            strokeWidth={STROKE}
            strokeDasharray={
              e.status === 'pending' ? `${DASH} ${DASH}` : undefined
            }
            strokeDashoffset={e.status === 'pending' ? DASH / 2 : undefined}
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
          className="absolute!"
          onClick={onNodeClick ? () => onNodeClick(n) : undefined}
          style={{ left: n.x, top: n.y }}
        />
      ))}
      {lines
        .filter((l) => l.e.marker)
        .map(({ e, x1, y1 }) => (
          <HandoffMarker
            key={`m-${e.from}-${e.to}`}
            status={e.marker!.status}
            dimmed={e.marker!.dimmed}
            size={MARKER}
            className="absolute"
            style={{
              left: x1 + e.marker!.dx - MARKER / 2,
              top: y1 - MARKER / 2,
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
            size={AVATAR}
            className="absolute!"
            style={{ left: n.x + (n.width ?? 175.2) - 30.07, top: n.y - 27.87 }}
          />
        ))}
      {overlays?.map((o) => (
        <div key={o.id} className="absolute" style={{ left: o.x, top: o.y }}>
          {o.content}
        </div>
      ))}
    </div>
  );
}
