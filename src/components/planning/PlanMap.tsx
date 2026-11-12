import clsx from 'clsx';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { edgePath } from '@/components/map/connectors';
import { useAdded, useGlide } from '@/lib/motion';
import { useAppState } from '@/state/store';

import { HelperCard, type HelperCardData } from './HelperCard';
import { edgeKey } from './planEdit';
import { MapPopoverHost } from './MapPopoverHost';
import { AddStepButton, ApprovalGate, StageLabel } from './PlanMapParts';

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
  /**
   * @deprecated Ignored: helper cards always hug their content. Some Figma instances pin a height that their
   * settings overflow (the Publisher); the user called that a bug, so the build deviates from Figma there.
   */
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
  /** Where its "+" (add a step on this line) sits, centre in map px. Default: middle of the run into `to`. */
  addAt?: { x: number; y: number };
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
  onAddStep,
  addStepOn,
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
  /** Shows a "+" on a connector when it's hovered (or focused); clicking it calls this with the edge and the
   *  button's centre. */
  onAddStep?: (edge: PlanEdge, at: { x: number; y: number }) => void;
  /** Edge key whose "+" stays visible (its add-step popover is open: 2.4c). */
  addStepOn?: string;
  className?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  // Motion (CLAUDE.md "Motion"): after an edit, cards glide to their new places, connectors interpolate to their
  // new routes and anything added fades in. A first paint is still.
  const scope = `plan:${useAppState().activeId}`;
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
        key: `${id}:${side}`,
      };
    const g = gateById.get(id);
    if (g)
      return {
        x: side === 'out' ? g.x + g.width : g.x,
        y: g.y + (GATE_H * (g.scale ?? scale)) / 2,
        port: false,
        key: `${id}:${side}`,
      };
    return null;
  };

  const ports = new Map<string, { x: number; y: number; color: string }>();
  const lines = edges.flatMap((e) => {
    const a = anchor(e.from, 'out');
    const b = anchor(e.to, 'in');
    if (!a || !b) return [];
    const color = e.color ?? '#91ade8';
    // Keyed by node side (one per position, as before), so a moving card's port glides with it.
    if (a.port) ports.set(a.key, { x: a.x, y: a.y, color });
    if (b.port) ports.set(b.key, { x: b.x, y: b.y, color });
    const lane = e.lane ?? (a.x + b.x) / 2;
    return [
      {
        key: edgeKey(e),
        edge: e,
        color,
        d: edgePath(a.x, a.y, b.x, b.y, lane, RADIUS * k, KAPPA),
        add: e.addAt ?? { x: (lane + b.x) / 2, y: b.y },
      },
    ];
  });

  const added = useAdded(scope, [
    ...nodes.map((n) => `node:${n.id}`),
    ...(gates ?? []).map((g) => `gate:${g.id}`),
    ...lines.map((l) => `line:${l.key}`),
  ]);

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
          <PlanLine
            key={l.key}
            isNew={added.has(`line:${l.key}`)}
            d={l.d}
            color={l.color}
            width={STROKE * k}
          />
        ))}
        {onAddStep &&
          lines.map((l) => (
            // A wide invisible stroke to hover the connector by.
            <path
              key={`hit-${l.key}`}
              d={l.d}
              stroke="transparent"
              strokeWidth={12}
              pointerEvents="stroke"
              onPointerEnter={() => setHovered(l.key)}
              onPointerLeave={() => setHovered((h) => (h === l.key ? null : h))}
            />
          ))}
        {[...ports.entries()].map(([key, p]) => (
          <circle
            key={key}
            cx={p.x}
            cy={p.y}
            className="pf-reroute"
            style={{ cx: p.x, cy: p.y } as CSSProperties}
            r={PORT_R * k}
            fill="white"
            stroke={p.color}
            strokeWidth={STROKE * k}
          />
        ))}
      </svg>
      {gates?.map((g) => (
        <Placed
          key={g.id}
          isNew={added.has(`gate:${g.id}`)}
          x={g.x}
          y={g.y}
          opacity={g.dimmed ? 0.5 : undefined}
        >
          <ApprovalGate
            label={g.label}
            scale={g.scale ?? scale}
            onClick={onGateClick ? () => onGateClick(g) : undefined}
          />
        </Placed>
      ))}
      {nodes.map((n) => (
        <Placed
          key={n.id}
          isNew={added.has(`node:${n.id}`)}
          x={n.x}
          y={n.y}
          opacity={n.opacity}
        >
          <HelperCard
            {...n}
            scale={scale}
            onClick={onNodeClick ? () => onNodeClick(n) : undefined}
            onSettingClick={
              onSettingClick ? (label) => onSettingClick(n, label) : undefined
            }
          />
        </Placed>
      ))}
      {onAddStep &&
        lines.map((l) => {
          const on = l.key === addStepOn || l.key === hovered;
          const size = 16.5 * scale;
          return (
            <div
              key={`add-${l.key}`}
              className="absolute"
              style={{
                left: l.add.x - size / 2,
                top: l.add.y - size / 2,
                opacity: on ? 1 : 0,
              }}
              onPointerEnter={() => setHovered(l.key)}
              onPointerLeave={() => setHovered((h) => (h === l.key ? null : h))}
            >
              <AddStepButton
                scale={scale}
                label={`Add a step between ${nodeById.get(l.edge.from)?.name ?? 'these'} and ${nodeById.get(l.edge.to)?.name ?? 'the next step'}`}
                onFocus={() => setHovered(l.key)}
                onClick={() => onAddStep(l.edge, l.add)}
              />
            </div>
          );
        })}
      {overlays?.map((o) => (
        <MapPopoverHost key={o.id} x={o.x} y={o.y}>
          {o.content}
        </MapPopoverHost>
      ))}
    </div>
  );
}

// A free-placed card or gate: glides when an edit moves it; one added after the map was on screen rises in.
function Placed({
  isNew,
  x,
  y,
  opacity,
  children,
}: {
  isNew: boolean;
  x: number;
  y: number;
  opacity?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGlide(ref, x, y);
  return (
    <div
      ref={ref}
      className={clsx('absolute', isNew && 'pf-rise')}
      style={{ left: x, top: y, opacity }}
    >
      {children}
    </div>
  );
}

// A connector: re-routes by interpolating its path (CSS `d`, where supported); a new one fades in.
function PlanLine({
  isNew,
  d,
  color,
  width,
}: {
  isNew: boolean;
  d: string;
  color: string;
  width: number;
}) {
  return (
    <path
      d={d}
      style={{ d: `path("${d}")` } as CSSProperties}
      className={clsx('pf-reroute', isNew && 'pf-fade')}
      stroke={color}
      strokeWidth={width}
    />
  );
}
