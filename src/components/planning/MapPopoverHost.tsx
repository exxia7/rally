import clsx from 'clsx';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useFitInView } from '@/lib/useFitInView';
import { useMediaQuery } from '@/lib/useMediaQuery';

// A free-placed plan-map overlay (drop zones, a flash ring, a popover's anchor): sits on the map at its stage point
// (`x`, `y`), so it pans and zooms with the map.
export function MapPopoverHost({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: ReactNode;
}) {
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {children}
    </div>
  );
}

// A plan-map popover (add a step, a helper's tools, "Before … runs"). Put it in a MapPopoverHost at the point it
// hangs from: it marks that point on the map and draws the popover outside the map at 1:1 (inside the scaled map it
// would shrink with it). From 768px it floats at that point (`align="end"`: its right edge there), follows the map
// while you pan or zoom, stays on screen (useFitInView, like Menu: shifts sideways, flips above, scrolls when tall)
// and hides while its point is panned out of the canvas. Nothing catches clicks around it: the popover's own
// outside-click closes it and the click still reaches what it landed on. On phones it's a bottom sheet over a scrim
// (a tap on the scrim closes it through the same outside-click), so the zoom bar and the map don't peek around it.
export function MapPopover({
  align = 'start',
  children,
}: {
  align?: 'start' | 'end';
  children: ReactNode;
}) {
  const phone = useMediaQuery('(max-width: 767.98px)');
  const mark = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ x: number; y: number; shown: boolean }>();

  // Follow the point every frame (panning scrolls, zoom transforms, the side panel resizes the canvas); state only
  // changes when it moved.
  useLayoutEffect(() => {
    if (phone) return;
    let raf = 0;
    const track = () => {
      const el = mark.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const x = Math.round(r.left);
        const y = Math.round(r.top);
        const shown = insideScrollers(el, x, y);
        setAt((a) =>
          a && a.x === x && a.y === y && a.shown === shown ? a : { x, y, shown }
        );
      }
      raf = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(raf);
  }, [phone]);
  useFitInView(pop, [at?.x, at?.y, phone]);

  return (
    <>
      <span ref={mark} aria-hidden className="absolute top-0 left-0 size-0" />
      {phone
        ? createPortal(
            <>
              <div
                aria-hidden
                className="fixed inset-0 z-40 bg-[rgba(29,30,34,0.24)]"
              />
              <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] justify-center overflow-y-auto overscroll-contain px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                {children}
              </div>
            </>,
            document.body
          )
        : at &&
          createPortal(
            <div
              className="fixed z-40 size-0"
              style={{
                left: at.x,
                top: at.y,
                visibility: at.shown ? undefined : 'hidden',
              }}
            >
              <div
                ref={pop}
                className={clsx(
                  'absolute top-0 w-max',
                  align === 'end' ? 'right-0' : 'left-0'
                )}
              >
                {children}
              </div>
            </div>,
            document.body
          )}
    </>
  );
}

// Whether a point is inside every scrolling or clipping box around `el` (not panned out of the canvas).
function insideScrollers(el: HTMLElement, x: number, y: number) {
  for (
    let p = el.parentElement;
    p && p !== document.body;
    p = p.parentElement
  ) {
    const s = getComputedStyle(p);
    if (/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY)) {
      const r = p.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
    }
  }
  return true;
}
