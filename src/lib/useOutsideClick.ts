import { useEffect, type RefObject } from 'react';

// Calls `onOutside` on a pointer-down outside every given element, or on Escape, while `active`.
// Shared by menus and popovers (attach menu, status filter, more menu).
export function useOutsideClick(
  refs: RefObject<HTMLElement | null>[],
  active: boolean,
  onOutside: () => void
) {
  useEffect(() => {
    if (!active) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (refs.every((r) => !r.current?.contains(target))) onOutside();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutside();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [refs, active, onOutside]);
}
