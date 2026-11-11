import clsx from 'clsx';

import emptyCanvas from '@/assets/art/illustration-empty-canvas.svg';
import miniMap from '@/assets/art/illustration-mini-map.svg';
import teamMap from '@/assets/art/illustration-team-map.svg';

// Figma "Illustration / Empty canvas" (2362:28581): empty-state drawing on a blank flowchart. Fills a
// 1362×830 canvas stage; the drawing sits at the Figma insets.
export function EmptyCanvasIllustration({ className }: { className?: string }) {
  return (
    <div
      className={clsx('relative h-[830px] w-[1362px] overflow-clip', className)}
    >
      <div className="absolute inset-[22.65%_9.17%_25.39%_9.17%]">
        <div className="absolute inset-[-0.2%_0]">
          <img src={emptyCanvas} alt="" className="size-full" />
        </div>
      </div>
    </div>
  );
}

// Figma "Illustration / Team map" (2362:28572): small team diagram on the planning start screen.
export function TeamMapIllustration({ className }: { className?: string }) {
  return (
    <img
      src={teamMap}
      alt=""
      className={clsx('h-16 w-[150px] shrink-0', className)}
    />
  );
}

// Figma "Illustration / Mini map" (2362:28579): workflow-card preview of a map (also used by WorkflowCard).
export function MiniMapIllustration({ className }: { className?: string }) {
  return (
    <img
      src={miniMap}
      alt=""
      className={clsx('h-[108px] w-[290px] shrink-0', className)}
    />
  );
}
