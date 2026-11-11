import type { ReactNode } from 'react';

import { edgePath } from '@/components/map/connectors';

import { HelperCard, type HelperCardData } from './HelperCard';
import { ApprovalGate, StageLabel } from './PlanMapParts';

// Plan-map geometry, from the 2.3 map where cards draw at 0.85 (154.275px wide): 1.054px connectors with
// 4.25px circular corners, 4.675px ports centred on the card header. Everything scales with `scale / 0.85`
// (the 2.4 drawer frames draw the same map at 0.5895: 3.24px ports).
const CARD_W = 181.5;
const HEADER_H = 36.3;
const GATE_H = 24.75;
const BASE = 0.85;
const STROKE = 1.054;
const RADIUS = 4.25;
const PORT_R = 1.8105;
const KAPPA = 0.5523;

export type PlanNode = HelperCardData & {
  id: string;
  x: number;
  y: number;
  /** Fixed card height in map px, when the Figma instance has one (the Publisher's well overflows it). */
  height?: number;
  /** Fades a card that isn't involved without the Dimmed state's 40% (the 2.4 drawer map uses 50%). */
  opacity?: number;
};

/** "You approve" pill on a connector. `width` is its drawn width in map px (connectors stop at its edges). */
export type PlanGate = {
  id: string;
  x: number;
  y: number;
  width: number;
  label?: string;
  /** Gate scale; defaults to the map's. */
  scale?: number;
  dimmed?: boolean;
};

export type PlanEdge = {
  /** A node or gate id. Gates have no ports. */
  from: string;
  to: string;
  /** Absolute x of the vertical run. Default: halfway between the two ends. */
  lane?: number;
  color?: string;
};

export type PlanStage = { label: string; x: number };

export type PlanOverlay = {
  id: string;
  x: number;
  y: number;
  content: ReactNode;
};

/** Everything that places a plan on the map: one per layout (2.3 wide, 2.4 beside the drawer…). */
export type PlanLayout = {
  scale: number;
  nodes: PlanNode[];
  edges: PlanEdge[];
  gates?: PlanGate[];
  stages?: PlanStage[];
  stageY?: number;
  /** Stage label scale (2.3: 0.85 → 10.2px; 2.4: 1 → 12px). */
  stageScale?: number;
};

// The planning map: helper cards, orthogonal connectors with ports, approval gates and stage labels, plus
// free-placed overlays (add-step buttons, inline editors). Data-driven like the run map's FlowMap.
export function PlanMap({
  nodes,
  edges,
  gates,
  stages,
  stageY = 0,
  stageScale,
  overlays,
  scale = BASE,
  x,
  y,
  width,
  height,
  onNodeClick,
  onSettingClick,
  onGateClick,
  className,
}: PlanLayout & {
  overlays?: PlanOverlay[];
  x?: number;
  y?: number;
  width: number;
  height: number;
  onNodeClick?: (node: PlanNode) => void;
  onSettingClick?: (node: PlanNode, label: string) => void;
  onGateClick?: (gate: PlanGate) => void;
  className?: string;
}) {
  const k = scale / BASE;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const gateById = new Map((gates ?? []).map((g) => [g.id, g]));

  // Where a connector leaves ('out') or enters ('in') a node or gate, and whether it draws a port there.
  const anchor = (id: string, side: 'in' | 'out') => {
    const n = nodeById.get(id);
    if (n)
      return {
        x: side === 'out' ? n.x + CARD_W * scale : n.x,
        y: n.y + (HEADER_H / 2) * scale,
        port: true,
      };
    const g = gateById.get(id);
    if (g)
      return {
        x: side === 'out' ? g.x + g.width : g.x,
        y: g.y + (GATE_H * (g.scale ?? scale)) / 2,
        port: false,
      };
    return null;
  };

  const ports = new Map<string, { x: number; y: number; color: string }>();
  const lines = edges.flatMap((e) => {
    const a = anchor(e.from, 'out');
    const b = anchor(e.to, 'in');
    if (!a || !b) return [];
    const color = e.color ?? '#91ade8';
    if (a.port) ports.set(`${a.x},${a.y}`, { x: a.x, y: a.y, color });
    if (b.port) ports.set(`${b.x},${b.y}`, { x: b.x, y: b.y, color });
    const lane = e.lane ?? (a.x + b.x) / 2;
    return [
      {
        key: `${e.from}-${e.to}`,
        color,
        d: edgePath(a.x, a.y, b.x, b.y, lane, RADIUS * k, KAPPA),
      },
    ];
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
      {stages?.map((s) => (
        <div
          key={s.label}
          className="absolute"
          style={{ left: s.x, top: stageY }}
        >
          <StageLabel label={s.label} scale={stageScale} />
        </div>
      ))}
      <svg
        width={width}
        height={height}
        overflow="visible"
        fill="none"
        className="pointer-events-none absolute top-0 left-0"
      >
        {lines.map((l) => (
          <path key={l.key} d={l.d} stroke={l.color} strokeWidth={STROKE * k} />
        ))}
        {[...ports.entries()].map(([key, p]) => (
          <circle
            key={key}
            cx={p.x}
            cy={p.y}
            r={PORT_R * k}
            fill="white"
            stroke={p.color}
            strokeWidth={STROKE * k}
          />
        ))}
      </svg>
      {gates?.map((g) => (
        <div
          key={g.id}
          className="absolute"
          style={{ left: g.x, top: g.y, opacity: g.dimmed ? 0.5 : undefined }}
        >
          <ApprovalGate
            label={g.label}
            scale={g.scale ?? scale}
            onClick={onGateClick ? () => onGateClick(g) : undefined}
          />
        </div>
      ))}
      {nodes.map((n) => (
        <div
          key={n.id}
          className="absolute"
          style={{ left: n.x, top: n.y, opacity: n.opacity }}
        >
          <HelperCard
            {...n}
            scale={scale}
            style={
              n.height
                ? // A selected card's stroke is thicker than the default 0.825px on each side
                  // (1.4px ink: +1.15; 2px accent: +2.35), and Figma's stroke takes layout space.
                  {
                    height:
                      n.height / scale +
                      (n.selected === 'accent' ? 2.35 : n.selected ? 1.15 : 0),
                  }
                : undefined
            }
            onClick={onNodeClick ? () => onNodeClick(n) : undefined}
            onSettingClick={
              onSettingClick ? (label) => onSettingClick(n, label) : undefined
            }
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
