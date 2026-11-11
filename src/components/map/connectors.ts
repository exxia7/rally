// Corner radius of map connectors at run-map scale (10px × 0.9223).
export const RUN_MAP_RADIUS = 9.22302;

// Orthogonal connector: out of the source port, along a vertical lane, into the target port, with
// rounded corners. The run map's corners use a 2/3 handle (kappa 0.667); the plan map's are circular
// arcs (kappa 0.5523).
export function edgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  lane: number,
  radius = RUN_MAP_RADIUS,
  kappa = 2 / 3
) {
  const dy = y2 - y1;
  if (Math.abs(dy) < 0.01) return `M${x1} ${y1}H${x2}`;
  const s = Math.sign(dy);
  const r = Math.min(radius, Math.abs(dy) / 2);
  const h = r * (1 - kappa);
  return [
    `M${x1} ${y1}`,
    `H${lane - r}`,
    `C${lane - h} ${y1} ${lane} ${y1 + s * h} ${lane} ${y1 + s * r}`,
    `V${y2 - s * r}`,
    `C${lane} ${y2 - s * h} ${lane + h} ${y2} ${lane + r} ${y2}`,
    `H${x2}`,
  ].join('');
}

