import clsx from 'clsx';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

import chevronDown from '@/assets/icons/chevron-down-14.svg';
import chevronUp from '@/assets/icons/chevron-up.svg';
import { Expand } from '@/components/motion/Motion';
import { Icon } from '@/components/ui/Icon';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { useScrollEdges } from '@/lib/useScrollEdges';

// Figma "Outputs card" (2362:30351), the card both canvas lists use: "What goes out" on the plan map and the run's
// Tasks list. White, 1px line border, 12px radius, layered drop shadow, 256px (wider only when the header needs it).
// Header: a 16px kind tile, Medium 14/20 title, an optional trailing summary and, when it folds, a chevron; 16/12
// padding. Open, a 1px divider and the rows (4px inset) follow, then an optional footer. On phones an open card is
// the canvas width minus 16px gutters. The body scrolls inside the card when the caller's max height cuts it,
// with a fade at the cut.
// Folding (`onOpenChange`): the header is the toggle (aria-expanded). While open, a pointer-down outside the card
// or Escape folds it: the outside click still lands on what it hit, and Escape returns focus to the header.
// Arrow keys (and Home/End) move between the header and the rows' buttons; a keyboard open focuses the first row.
// Callers place it (absolute, 16px in from the canvas edges) and cap its height.
const CANVAS_CARD_LAYER = 'z-10';

// The open card's focusable rows: the buttons in its body that are showing.
const rowButtons = (card: HTMLElement | null) =>
  Array.from(
    card?.querySelectorAll<HTMLElement>(
      '[data-card-body] button:not([disabled])'
    ) ?? []
  ).filter((el) => el.getClientRects().length > 0);

export function CanvasListCard({
  icon,
  title,
  summary,
  open = true,
  onOpenChange,
  footer,
  children,
  className,
  style,
}: {
  /** The kind tile's glyph (drawn in a 16px box). */
  icon: ReactNode;
  title: string;
  /** Trailing header content (the Tasks count and bar). */
  summary?: ReactNode;
  open?: boolean;
  /** Makes the card foldable: the header toggles it; outside clicks and Escape fold it. */
  onOpenChange?: (open: boolean) => void;
  /** Pinned under the scrolling rows. */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const card = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLButtonElement>(null);
  const bodyId = useId();
  const foldable = !!onOpenChange;
  // Set when the keyboard opened it: focus the first row once the rows render.
  const focusFirst = useRef(false);

  const refs = useMemo(() => [card], []);
  const dismiss = useCallback(() => {
    if (card.current?.contains(document.activeElement)) header.current?.focus();
    onOpenChange?.(false);
  }, [onOpenChange]);
  useOutsideClick(refs, foldable && open, dismiss);

  useEffect(() => {
    if (open && focusFirst.current) rowButtons(card.current)[0]?.focus();
    focusFirst.current = false;
  }, [open]);

  const onHeaderClick = (e: MouseEvent) => {
    // A click with no pointer (Enter / Space) comes from the keyboard.
    if (!open && e.detail === 0) focusFirst.current = true;
    onOpenChange?.(!open);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const onHeader = document.activeElement === header.current;
    if (foldable && !open) {
      if (onHeader && e.key === 'ArrowDown') {
        e.preventDefault();
        focusFirst.current = true;
        onOpenChange?.(true);
      }
      return;
    }
    const items = [
      ...(foldable && header.current ? [header.current] : []),
      ...rowButtons(card.current),
    ];
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    e.preventDefault();
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? items.length - 1
          : (at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) %
            items.length;
    items[next].focus();
  };

  const headerContent = (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center overflow-clip rounded-[6px]">
        {icon}
      </span>
      <p className="min-w-px flex-1 text-[14px] leading-5 font-medium tracking-[-0.0878px] whitespace-nowrap text-ink">
        {title}
      </p>
      {summary}
      {foldable && <Icon src={open ? chevronUp : chevronDown} size={14} />}
    </>
  );
  const headerClass = clsx(
    'flex w-full shrink-0 items-center gap-2 px-4 py-3',
    open && 'border-b border-line'
  );

  return (
    <div
      ref={card}
      onKeyDown={onKeyDown}
      // Tabbing out of an open card folds it, like a click outside.
      onBlur={(e) => {
        if (
          foldable &&
          open &&
          e.relatedTarget &&
          !card.current?.contains(e.relatedTarget)
        )
          onOpenChange?.(false);
      }}
      style={style}
      className={clsx(
        CANVAS_CARD_LAYER,
        'flex w-max max-w-[calc(100%-32px)] min-w-64 flex-col items-start rounded-card border border-line bg-white [filter:drop-shadow(0px_1px_1.5px_rgba(0,0,0,0.06))_drop-shadow(0px_8px_12px_rgba(0,0,0,0.12))]',
        open && 'max-md:w-[calc(100%-32px)]',
        className
      )}
    >
      {foldable ? (
        <button
          ref={header}
          type="button"
          aria-expanded={open}
          aria-controls={open ? bodyId : undefined}
          onClick={onHeaderClick}
          className={clsx(
            headerClass,
            'text-left hover:bg-hover',
            open ? 'rounded-t-[11px]' : 'rounded-[11px]'
          )}
        >
          {headerContent}
        </button>
      ) : (
        <div className={headerClass}>{headerContent}</div>
      )}
      <Expand
        open={open}
        className="flex min-h-0 w-full flex-col overflow-hidden"
      >
        <CardBody id={bodyId} padEnd={!footer}>
          {children}
        </CardBody>
        {footer && (
          <div className="flex w-full shrink-0 items-start px-1 pt-1 pb-2">
            {footer}
          </div>
        )}
      </Expand>
    </div>
  );
}

// The rows' scroll area, mounted while the card is open. `contain:inline-size`: the rows never widen the card; they
// fill the header's width and truncate.
function CardBody({
  id,
  padEnd,
  children,
}: {
  id: string;
  padEnd: boolean;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(body);
  return (
    <div className="relative flex min-h-0 w-full flex-col [contain:inline-size]">
      <div
        ref={body}
        id={id}
        data-card-body
        className={clsx(
          'flex min-h-0 w-full flex-col items-start overflow-y-auto overscroll-contain px-1 pt-1',
          padEnd && 'pb-2'
        )}
      >
        {children}
      </div>
      {edges.bottom && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent"
        />
      )}
    </div>
  );
}

// The card's only motion (design/non-figma-ui.md "Motion") is <Expand> (src/components/motion/Motion.tsx): the body
// grows from the header to its height and fades in, and folds back the same way, 220ms ease-out. Not on first paint
// (a `*-tasks` frame opens drawn), and instant under reduced motion.

// Figma "Output row" (2362:30364), shared by both lists: 32px, 12px sides, 8px gap, 6px radius; a 16px icon, the
// label (13/20, muted for a finished step) and optional trailing content. Hover = well fill. With `onClick` the row
// is a button.
export function CanvasListRow({
  icon,
  label,
  trailing,
  muted,
  onClick,
  className,
}: {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  muted?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const cls = clsx(
    'group flex h-8 w-full shrink-0 items-center gap-2 rounded-[6px] px-3 text-left hover:bg-well',
    className
  );
  const content = (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center">
        {icon}
      </span>
      <p
        title={label}
        className={clsx(
          'min-w-px flex-1 truncate text-[13px] leading-5 tracking-[-0.0878px]',
          muted ? 'text-muted' : 'text-ink'
        )}
      >
        {label}
      </p>
      {trailing}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}
