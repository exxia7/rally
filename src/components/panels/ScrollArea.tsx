import clsx from 'clsx';
import { useCallback, useRef, type ReactNode, type Ref } from 'react';

import { useScrollEdges } from '@/lib/useScrollEdges';

// The side panel's scrolling body (and the run Chat thread): fills the space between a panel's header and its
// footer or composer, which stay put, and scrolls when its content outgrows it. While content is scrolled under
// the header a 1px line separates them (drawn on the header's last pixel row, so a header that already has a bottom
// line doesn't get a second one); while there's more below, a fade at the bottom cut shows it scrolls. Same
// treatment as Modal's body.
export function ScrollArea({
  children,
  className,
  ref,
  phoneFlow,
}: {
  /** Under 768px don't scroll here: the content flows in a parent that scrolls (SidePanel's phoneHeader="scroll"). */
  phoneFlow?: boolean;
  children: ReactNode;
  /** Classes for the scrolling element (padding, gap, alignment). */
  className?: string;
  ref?: Ref<HTMLDivElement>;
}) {
  const inner = useRef<HTMLDivElement | null>(null);
  const edges = useScrollEdges(inner);
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      inner.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref]
  );
  return (
    <div
      className={clsx(
        'relative flex min-h-0 w-full flex-1 flex-col',
        phoneFlow && 'max-md:flex-none'
      )}
    >
      <div
        ref={setRef}
        className={clsx(
          'flex min-h-0 w-full flex-1 flex-col items-start overflow-x-clip overflow-y-auto overscroll-contain',
          phoneFlow && 'max-md:flex-none max-md:overflow-visible',
          className
        )}
      >
        {children}
      </div>
      {edges.top && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-px h-px bg-line"
        />
      )}
      {edges.bottom && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent"
        />
      )}
    </div>
  );
}
