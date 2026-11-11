import type { NewStep } from './AddStepPopover';
import type { PlanEdge, PlanLayout, PlanNode } from './PlanMap';

// Plan-map edits that change the layout. Plain functions: the screen keeps the edits in its local state and
// replays them onto whichever layout it draws (2.3 full size, 2.4 compact…).

const CARD_W = 181.5;
const HEADER_H = 36.3;
const GATE_H = 24.75;
/** Gap between two columns of cards at map scale 0.85 (2.3: 49.09px). */
const COL_GAP = 49.0875 / 0.85;
/** Drawn width of a gate pill at scale 1, by label. */
const GATE_W = { approval: 100.25, condition: 80 };

/** Inserts a step on the line `edge`: everything from the line's end rightwards moves over to make room, the
 *  step takes the end's old place (aligned with its port), and the line becomes from → step → to. */
export function insertStep(
  plan: PlanLayout,
  edge: Pick<PlanEdge, 'from' | 'to'>,
  step: NewStep,
  id: string
): PlanLayout {
  const s = plan.scale;
  const node = plan.nodes.find((n) => n.id === edge.to);
  const gate = plan.gates?.find((g) => g.id === edge.to);
  const target = node ?? gate;
  if (!target) return plan;
  const portY = node
    ? node.y + (HEADER_H / 2) * s
    : (gate?.y ?? 0) + (GATE_H * (gate?.scale ?? s)) / 2;
  const x0 = target.x;
  const gap = COL_GAP * s;
  const width = step.type === 'helper' ? CARD_W * s : GATE_W[step.type] * s;
  const shift = width + gap;
  const right = <T extends { x: number }>(o: T): T =>
    o.x >= x0 - 0.5 ? { ...o, x: o.x + shift } : o;

  const nodes = plan.nodes.map(right);
  let gates = plan.gates?.map(right) ?? [];
  if (step.type === 'helper') {
    const added: PlanNode = {
      id,
      name: step.name,
      kind: 'action',
      description: step.description,
      settings: [{ label: 'Model', value: 'Claude Haiku 5.5' }],
      state: 'new',
      x: x0,
      y: portY - (HEADER_H / 2) * s,
    };
    nodes.push(added);
  } else {
    gates = [
      ...gates,
      {
        id,
        x: x0,
        y: portY - (GATE_H * s) / 2,
        width,
        label: step.type === 'approval' ? 'You approve' : 'Only if…',
      },
    ];
  }
  const edges = plan.edges.flatMap((e) =>
    e.from === edge.from && e.to === edge.to
      ? [
          { from: e.from, to: id },
          { from: id, to: e.to },
        ]
      : [{ ...e, addAt: undefined }]
  );
  return {
    ...plan,
    nodes,
    gates,
    edges,
    stages: plan.stages?.map(right),
  };
}

/** The right edge of everything on the map, in map px (to grow the stage after inserts). */
export function planRight(plan: PlanLayout) {
  return Math.max(
    ...plan.nodes.map((n) => n.x + CARD_W * plan.scale),
    ...(plan.gates ?? []).map((g) => g.x + g.width)
  );
}

/** An edge's key, as `onAddStep` and `addStepOn` name it. */
export const edgeKey = (e: Pick<PlanEdge, 'from' | 'to'>) =>
  `${e.from}-${e.to}`;
