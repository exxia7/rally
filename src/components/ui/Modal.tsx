import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

import { transitions, useEnter, useTransition, variants } from '@/lib/motion';

import { useScrollEdges } from '@/lib/useScrollEdges';

// Modal dialog (Figma "Scrim" + "Rerun modal", frame 4.1b, 2362:27129): a 30% ink scrim over the whole frame,
// the dialog centred: 460px, white, 1px line border, 14px radius, 24px top/sides, 20px bottom, 16px gaps,
// 0/16/40 shadow. Escape and a click on the scrim close it. Never wider than the viewport minus 32px.
// `appearance="summary"` is the 5.2 launch summary (2362:25683): no border, 10px radius, 28px padding, 1/3 + 12/32
// shadow, over a 30% #1d1e22 scrim with a 2px backdrop blur. `contained` fills the nearest positioned parent
// (the map canvas) instead of the whole window.
//
// Layout: the header (`title` + `description`, or a custom `header`) and the `footer` (the button row) stay put;
// the children are the body, which scrolls once the dialog reaches the viewport's height. While content is scrolled
// under the header or the footer, a 1px line separates them, and a fade at the bottom cut shows there's more. An
// overflowing body gets bottom padding, so its last item clears the footer when scrolled to the end.
type Appearance = 'dialog' | 'summary';

const STYLE: Record<
  Appearance,
  {
    box: string;
    x: string;
    header: string;
    footer: string;
    /** Body padding when it has no header above / no footer below it. */
    top: string;
    bottom: string;
    /** Body bottom padding while it scrolls, so the last item clears the footer. */
    end: string;
    gap: string;
  }
> = {
  dialog: {
    box: 'rounded-[14px] border border-line shadow-[0px_16px_40px_0px_rgba(0,0,0,0.18)]',
    x: 'px-6 max-md:px-5',
    header: 'pt-6 pb-4',
    footer: 'pt-4 pb-5',
    top: 'pt-6',
    bottom: 'pb-5',
    end: 'pb-4',
    gap: 'gap-4',
  },
  summary: {
    box: 'rounded-[10px] shadow-[0px_1px_3px_0px_rgba(16,18,24,0.06),0px_12px_32px_0px_rgba(16,18,24,0.1)]',
    x: 'px-7 max-md:px-5',
    header: 'pt-7 pb-6 max-md:pt-5 max-md:pb-5',
    footer: 'pt-6 pb-7 max-md:pt-5 max-md:pb-5',
    top: 'pt-7 max-md:pt-5',
    bottom: 'pb-7 max-md:pb-5',
    end: 'pb-6 max-md:pb-5',
    gap: '',
  },
};

type Props = {
  appearance?: Appearance;
  contained?: boolean;
  open: boolean;
  onClose: () => void;
  label: string;
  width?: number;
  /** The standard header: SemiBold 18/26 title over a 13/19 ink-2 description, 6px apart. */
  title?: ReactNode;
  description?: ReactNode;
  /** A custom fixed header, in place of `title` / `description`. */
  header?: ReactNode;
  /** The fixed button row, right-aligned with 8px gaps. */
  footer?: ReactNode;
  /** The body (scrolls). */
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

// Motion: opened while you watch, the scrim fades in and the dialog scales up from 97% (240ms); closing reverses it.
// A frame that opens with the modal showing (4.1b) paints it still.
export function Modal(props: Props) {
  const appear = useEnter();
  return (
    <AnimatePresence initial={appear}>
      {props.open && <ModalFrame key="modal" {...props} />}
    </AnimatePresence>
  );
}

function ModalFrame({
  onClose,
  label,
  width = 460,
  title,
  description,
  header,
  footer,
  children,
  className,
  bodyClassName,
  appearance = 'dialog',
  contained,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(bodyRef);
  const s = STYLE[appearance];
  const head =
    header ??
    (title !== undefined && (
      <div className="flex w-full flex-col items-start gap-1.5">
        <p className="w-full text-[18px] leading-[26px] font-semibold text-ink">
          {title}
        </p>
        {description !== undefined && (
          <p className="w-full text-[13px] leading-[19px] text-ink-2">
            {description}
          </p>
        )}
      </div>
    ));
  const overflowing = edges.top || edges.bottom;
  const t = useTransition(transitions.base);
  return (
    <motion.div
      variants={variants.fadeIn}
      initial="hidden"
      animate="shown"
      exit="hidden"
      transition={t}
      className={clsx(
        'inset-0 z-50 flex items-center justify-center p-4',
        contained ? 'absolute' : 'fixed',
        appearance === 'summary'
          ? 'bg-[rgba(29,30,34,0.3)] backdrop-blur-[2px]'
          : 'bg-[rgba(17,18,20,0.3)]'
      )}
      onClick={onClose}
    >
      <motion.div
        variants={variants.scaleIn}
        transition={t}
        role="dialog"
        aria-modal
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        style={{ width }}
        className={clsx(
          'flex max-h-full max-w-full min-h-0 shrink-0 flex-col overflow-hidden bg-white',
          s.box,
          className
        )}
      >
        {head && (
          <div
            className={clsx(
              'w-full shrink-0 border-b',
              s.x,
              s.header,
              edges.top ? 'border-line' : 'border-transparent'
            )}
          >
            {head}
          </div>
        )}
        <div className="relative flex min-h-0 w-full flex-1 flex-col">
          <div
            ref={bodyRef}
            className={clsx(
              'flex min-h-0 w-full flex-col items-start overflow-x-clip overflow-y-auto overscroll-contain',
              s.x,
              s.gap,
              !head && s.top,
              footer ? overflowing && s.end : s.bottom,
              bodyClassName
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
        {footer && (
          <div
            className={clsx(
              'flex w-full shrink-0 flex-wrap items-center justify-end gap-2 border-t',
              s.x,
              s.footer,
              edges.bottom ? 'border-line' : 'border-transparent'
            )}
          >
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
