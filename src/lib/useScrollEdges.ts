import { useCallback, useEffect, useState, type RefObject } from 'react';

// Whether a scroll container has content hidden above (`top`) or below (`bottom`) its viewport. Modals use it to
// draw a divider under the header / over the footer only while content is scrolled under them, and a fade at the
// cut while there's more to scroll. Re-measures on scroll and whenever the container or its content resizes.
export function useScrollEdges(ref: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const top = el.scrollTop > 0;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((e) =>
      e.top === top && e.bottom === bottom ? e : { top, bottom }
    );
  }, [ref]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    const mo = new MutationObserver(() => {
      for (const child of Array.from(el.children)) ro.observe(child);
      measure();
    });
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
      mo.disconnect();
    };
  }, [ref, measure]);
  return edges;
}
