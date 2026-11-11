import type { ReactNode } from 'react';

import { edgePath } from '@/components/map/connectors';

import { HelperCard, type HelperCardData } from './HelperCard';

// Plan-map geometry at the scale the 2.x frames draw it (cards at 0.85: 154.275px wide; connectors
// 1.054px with 4.25px circular corners; 4.675px ports centred on the card header).
const CARD_W = 181.5;
const STROKE = 1.054;
const RADIUS = 4.25;
const PORT_R = 1.8105;
const KAPPA = 0.5523;

export type PlanNode = HelperCardData & { id: string; x: number; y: number };

export type PlanEdge = {
  from: string;
  to: string;
  /** Absolute x of the vertical run. Default: halfway between the two cards. */
  lane?: number;
  color?: string;
};

export type PlanOverlay = { id: string; x: number; y: number; content: ReactNode };

// The planning map: helper cards, orthogonal connectors with ports, plus free-placed overlays
// (stage labels, approval gates, add-step buttons). Data-driven like the run map's FlowMap.
export function PlanMap({
  nodes,
  edges,
  overlays,
  scale = 0.85,
  x,
  y,
  width,
  height,
  onNodeClick,
  className,
}: {
  nodes: PlanNode[];
  edges: PlanEdge[];
  overlays?: PlanOverlay[];
  scale?: number;
  x?: number;
  y?: number;
  width: number;
  height: number;
  onNodeClick?: (node: PlanNode) => void;
  className?: string;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const portDy = (36.3 / 2) * scale;
  const ports = new Map<string, { x: number; y: number; color: string }>();
  const lines = edges.flatMap((e) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) return [];
    const x1 = a.x + CARD_W * scale;
    const y1 = a.y + portDy;
    const x2 = b.x;
    const y2 = b.y + portDy;
    const color = e.color ?? '#91ade8';
    ports.set(`${x1},${y1}`, { x: x1, y: y1, color });
    ports.set(`${x2},${y2}`, { x: x2, y: y2, color });
    const lane = e.lane ?? (x1 + x2) / 2;
    return [{ key: `${e.from}-${e.to}`, color, d: edgePath(x1, y1, x2, y2, lane, RADIUS, KAPPA) }];
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
        fill="none"
        className="pointer-events-none absolute top-0 left-0"
      >
        {lines.map((l) => (
          <path key={l.key} d={l.d} stroke={l.color} strokeWidth={STROKE} />
        ))}
        {[...ports.entries()].map(([k, p]) => (
          <circle key={k} cx={p.x} cy={p.y} r={PORT_R} fill="white" stroke={p.color} strokeWidth={STROKE} />
        ))}
      </svg>
      {nodes.map((n) => (
        <div key={n.id} className="absolute" style={{ left: n.x, top: n.y }}>
          <HelperCard
            {...n}
            scale={scale}
            onClick={onNodeClick ? () => onNodeClick(n) : undefined}
          />
        </div>
      ))}
      {overlays?.map((o) => (
        <div key={o.id} className="absolute" style={{ left: o.x, top: o.y }}>
          {o.content}
        </div>
      ))}
    </div>
  );
}
