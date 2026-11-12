import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useMediaQuery } from '@/lib/useMediaQuery';

// Where a plan-map popover (add a step, tools, "Checks with you") is drawn. From 768px it sits on the map at its
// stage point (`x`, `y`), so it pans and zooms with the map. On phones the map is wider than the screen, so the
// popover would hang off its edge: it opens as a bottom sheet instead, above the tab bar, and scrolls if tall.
export function MapPopoverHost({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: ReactNode;
}) {
  const phone = useMediaQuery('(max-width: 767.98px)');
  if (phone)
    return createPortal(
      <div className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-40 flex max-h-[70dvh] justify-center overflow-y-auto overscroll-contain px-3 pb-3">
        {/* The popovers draw at the map's scale (0.85); 1.2× brings their text back to a readable size. */}
        <div style={{ zoom: 1.2 }}>{children}</div>
      </div>,
      document.body
    );
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {children}
    </div>
  );
}
