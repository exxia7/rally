import type { MapNode } from './FlowMap';

/** Run maps draw their cards at Figma's 83% (the readout on the run frames), so that is the zoom label at zoom 1. */
export const RUN_MAP_SCALE = 0.83;

/**
 * The stage point a run map keeps in view (MapCanvas `focus`): the node that needs you (or whose helper raised its
 * hand), else the first one working, else "Ready to post". `place` is where the FlowMap sits on the stage and
 * `scale` the size it is drawn at.
 */
export function runMapFocus(
  nodes: MapNode[],
  place: { x: number; y: number },
  scale = 1,
) {
  const node =
    nodes.find(
      (n) => n.state === 'needs-you' || n.avatar?.state === 'hand-raised',
    ) ??
    nodes.find((n) => n.state === 'working') ??
    nodes.find((n) => n.id === 'ready');
  return (
    node && {
      x: place.x + (node.x + (node.width ?? 175.2) / 2) * scale,
      y: place.y + (node.y + 60) * scale,
    }
  );
}
