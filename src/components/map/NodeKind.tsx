import clsx from 'clsx';

import actionGlyph from '@/assets/icons/node-kind-action-glyph.svg';
import action from '@/assets/icons/node-kind-action.svg';
import decisionLg from '@/assets/icons/node-kind-decision-lg.svg';
import decision from '@/assets/icons/node-kind-decision.svg';
import output from '@/assets/icons/node-kind-output.svg';
import taskGlyph from '@/assets/icons/node-kind-task-glyph.svg';
import task from '@/assets/icons/node-kind-task.svg';

export type NodeKindName = 'task' | 'action' | 'decision' | 'output';

// Tile fill per kind (Node kind, Style=Tile).
const KIND_TILE: Record<NodeKindName, string> = {
  task: 'bg-[#fdecf1]',
  action: 'bg-[#e8effa]',
  decision: 'bg-[#fff4e0]',
  output: 'bg-[#e8effa]',
};

const TILE_GLYPH: Record<NodeKindName, string> = {
  task,
  action,
  decision,
  output,
};

// Figma "Node kind" (2362:30023), Style=Tile: the kind mark on a tinted square. On run-map cards it is
// 20.291px (Task: 5.534px radius, 11.99px mark; others: 4.95px radius, 10.725px mark). Planning cards use
// size 18.15. `emphasis` is the Decision · Needs you tile with the larger mark.
export function NodeKindTile({
  kind,
  size = 20.291,
  emphasis,
  glyphSize,
  radius: radiusOverride,
  className,
}: {
  kind: NodeKindName;
  size?: number;
  emphasis?: boolean;
  /** Instance overrides of the mark size and corner radius (some docked-map instances keep the larger mark). */
  glyphSize?: number;
  radius?: number;
  className?: string;
}) {
  const glyph =
    glyphSize ?? (kind === 'task' ? 11.99 : emphasis ? 15.732 : 10.725);
  const radius =
    radiusOverride ?? (kind === 'task' ? 5.534 : emphasis ? 7.261 : 4.95);
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center',
        KIND_TILE[kind],
        className
      )}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <img
        src={emphasis && kind === 'decision' ? decisionLg : TILE_GLYPH[kind]}
        alt=""
        style={{ width: glyph, height: glyph }}
      />
    </div>
  );
}

// Node kind, Style=Glyph: the bare 11.99px mark (Action, Task).
export function NodeKindGlyph({
  kind,
  className,
}: {
  kind: 'action' | 'task';
  className?: string;
}) {
  return (
    <img
      src={kind === 'task' ? taskGlyph : actionGlyph}
      alt=""
      className={clsx('size-[11.99px] shrink-0', className)}
    />
  );
}
