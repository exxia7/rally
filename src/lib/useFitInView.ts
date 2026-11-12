import { useLayoutEffect, type RefObject } from 'react';

const MARGIN = 8;

// The area a popover can be seen in: the viewport, cut down by every ancestor that clips or scrolls its content.
function visibleBounds(el: HTMLElement) {
  let top = 0;
  let left = 0;
  let bottom = window.innerHeight;
  let right = window.innerWidth;
  for (
    let p = el.parentElement;
    p && p !== document.body;
    p = p.parentElement
  ) {
    const s = getComputedStyle(p);
    if (/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY)) {
      const r = p.getBoundingClientRect();
      top = Math.max(top, r.top);
      left = Math.max(left, r.left);
      bottom = Math.min(bottom, r.bottom);
      right = Math.min(right, r.right);
    }
  }
  return { top, left, bottom, right };
}

// Keeps an absolutely positioned popover (a menu opened from a button) on screen. Its classes place it as designed
// (e.g. `absolute top-9 left-0`); after layout this shifts it sideways to stay inside the visible area, flips it to
// the other side of its anchor (the positioned parent) when it doesn't fit, and caps its height so a tall one
// scrolls. It shifts with the `translate` property, so keyframes that animate `transform` are untouched. Call it in the
// popover component; it measures when the popover mounts and when the window resizes.
export function useFitInView(
  ref: RefObject<HTMLElement | null>,
  deps: unknown[] = []
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.translate = '';
      el.style.maxHeight = '';
      el.style.overflowY = '';
      const box = el.getBoundingClientRect();
      const view = visibleBounds(el);
      const anchor = (
        el.offsetParent as HTMLElement | null
      )?.getBoundingClientRect();
      // Sideways: keep it MARGIN inside the visible area.
      let dx = 0;
      if (box.right > view.right - MARGIN) dx = view.right - MARGIN - box.right;
      if (box.left + dx < view.left + MARGIN)
        dx = view.left + MARGIN - box.left;
      // Up/down: flip to the anchor's other side when it doesn't fit and that side has more room; cap the height
      // to the room on the chosen side, so a tall popover scrolls.
      let dy = 0;
      if (anchor) {
        const below = box.top >= anchor.bottom - 1;
        const above = box.bottom <= anchor.top + 1;
        const gap = below ? box.top - anchor.bottom : anchor.top - box.bottom;
        const room = {
          below: view.bottom - MARGIN - (anchor.bottom + gap),
          above: anchor.top - gap - (view.top + MARGIN),
        };
        const side = below ? 'below' : above ? 'above' : undefined;
        if (side && box.height > room[side]) {
          const other = side === 'below' ? 'above' : 'below';
          const to = room[other] > room[side] ? other : side;
          if (box.height > room[to]) {
            el.style.maxHeight = `${Math.max(room[to], 96)}px`;
            el.style.overflowY = 'auto';
          }
          const h = el.getBoundingClientRect();
          const top = to === 'below' ? anchor.bottom + gap : anchor.top - gap - h.height;
          dy = top - h.top;
        }
      }
      if (dx || dy) {
        // Added to any translate its classes already set (e.g. -translate-x-1/2).
        const [bx = 0, by = 0] = getComputedStyle(el)
          .translate.split(' ')
          .map((v) => parseFloat(v) || 0);
        el.style.translate = `${bx + dx}px ${by + dy}px`;
      }
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass what changes the popover's size
  }, [ref, ...deps]);
}
