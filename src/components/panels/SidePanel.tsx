import clsx from 'clsx';
import { motion } from 'framer-motion';
import {
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type Ref,
} from 'react';

import close from '@/assets/icons/close.svg';
import { IconButton } from '@/components/ui/IconButton';
import { PanelEnter, reducedMotion, transitions, variants } from '@/lib/motion';

import { ScrollArea } from './ScrollArea';

// The right-hand side panel (Figma "Artifact panel", e.g. 2362:23590; Chat · Sandbox · Decisions, inspector,
// drawers): 400px, white, 1px line border, 12px radius, docked beside the main panel with the shell's 8px gap.
// Title header (plan, 2362:23591): 52px, 1px bottom line, 16px left / 10px right padding, SemiBold 14/20 title, ghost ×.
// Tabs header (run, 2362:25046): Panel tabs at 24px sides, 20px top / 12px bottom, no line; on desktop the
// top bar's panel toggle closes it, so its × only shows under 1280px.
// Pass it to AppShell's `aside`. Under 1280px it overlays the content from the right over a scrim; under 768px
// it is a full-screen sheet. Clicking the scrim closes it.
// `header` replaces the built-in headers (the inspector's own header); `footer` is pinned under the scrolling body
// (the inspector's Edit / I'll do this one bar).
// The body is a ScrollArea between the header and the footer, which stay put: it scrolls when content outgrows it,
// with a line under the header while scrolled and a fade at the bottom while there's more. `scroll={false}` hands
// scrolling to the content (the run Chat scrolls its thread above its own composer).
// `sheet="half"` (inspector, approval): under 768px a bottom sheet 56% of the screen tall instead of a full-screen
// one, so the top bar's status pill and the card it's about stay in view above it. `sheet="tall"` (hand-raise): an
// 85%-tall sheet, for content you have to act on. `phoneHeader="scroll"`: under 768px the custom `header` scrolls
// away with the body instead of staying put, so a tall header doesn't eat a sheet (the scrim and Escape still close).
export function SidePanel({
  sheet = 'full',
  title,
  tabs,
  onClose,
  headerExtra,
  header,
  footer,
  children,
  className,
  bodyClassName,
  scroll = true,
  bodyRef,
  enter,
  phoneHeader = 'sticky',
}: {
  /** Under 768px: keep the custom `header` put ('sticky', default) or let it scroll with the body ('scroll'). */
  phoneHeader?: 'sticky' | 'scroll';
  /** Motion: slide in on mount. Default: when the panel slot opens while you watch (AppShell's PanelEnter). */
  enter?: boolean;
  sheet?: 'full' | 'half' | 'tall';
  title?: ReactNode;
  tabs?: ReactNode;
  onClose?: () => void;
  headerExtra?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  scroll?: boolean;
  /** The scrolling body (e.g. to scroll back to the top when the content changes). */
  bodyRef?: Ref<HTMLDivElement>;
}) {
  // While it overlays the content (under 1280px) it behaves like a dialog: Escape closes it, unless a menu
  // inside it is open (that Escape belongs to the menu). Docked on desktop it stays put.
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (window.matchMedia('(min-width: 1280px)').matches) return;
      if (document.querySelector('[role="menu"]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Motion (framer-motion): it slides in from the right (24px + fade, 240ms; on phones the sheet rises from the
  // bottom) when it opens while you watch, and out when it closes. Docked on desktop it leaves at once, so the map
  // never sits beside an empty slot. The scrim fades. Nothing plays on a first paint or under reduced motion.
  const fromShell = useContext(PanelEnter);
  const [play] = useState(() => (enter ?? fromShell) && !reducedMotion());
  const [media] = useState(() =>
    typeof window === 'undefined'
      ? { phone: false, docked: true }
      : {
          phone: window.matchMedia('(max-width: 767.98px)').matches,
          docked: window.matchMedia('(min-width: 1280px)').matches,
        }
  );
  const slide = media.phone ? variants.sheetUp : variants.slideInRight;
  const leaves = !media.docked && !reducedMotion();
  return (
    <>
      <motion.div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 z-30 hidden bg-[rgba(29,30,34,0.24)] max-xl:block"
        variants={variants.fadeIn}
        initial={play ? 'hidden' : false}
        animate="shown"
        exit={leaves ? 'hidden' : undefined}
        transition={transitions.base}
      />
      <motion.aside
        variants={slide}
        initial={play ? 'hidden' : false}
        animate="shown"
        exit={leaves ? 'hidden' : undefined}
        transition={transitions.base}
        data-side-panel
        className={clsx(
          'flex h-full w-[400px] shrink-0 flex-col items-start overflow-clip rounded-card border border-line bg-white',
          'max-xl:absolute max-xl:inset-y-2 max-xl:right-2 max-xl:z-40 max-xl:h-auto max-xl:max-w-[calc(100%-16px)] max-xl:shadow-[0px_8px_32px_0px_rgba(0,0,0,0.16)]',
          'max-md:fixed max-md:inset-0 max-md:w-full max-md:max-w-none max-md:rounded-none max-md:border-0',
          sheet !== 'full' &&
            'max-md:top-auto max-md:rounded-t-[16px] max-md:shadow-[0px_-8px_32px_0px_rgba(0,0,0,0.16)]',
          sheet === 'half' && 'max-md:h-[56dvh]',
          sheet === 'tall' && 'max-md:h-[85dvh]',
          // Phones: the whole sheet scrolls (header included) and the footer sticks to its bottom.
          phoneHeader === 'scroll' && 'max-md:overflow-y-auto',
          className
        )}
      >
        {header}
        {!header &&
          (tabs ? (
            <div className="flex w-full shrink-0 items-center gap-2 px-6 pt-5 pb-3 max-md:px-4">
              <div className="flex min-w-px flex-1 items-center">{tabs}</div>
              {headerExtra}
              {onClose && (
                <IconButton
                  icon={close}
                  iconSize={16}
                  label="Close panel"
                  onClick={onClose}
                  className="xl:hidden"
                />
              )}
            </div>
          ) : title !== undefined ? (
            <div className="flex h-[52px] w-full shrink-0 items-center gap-2 overflow-clip border-b border-line pr-2.5 pl-4">
              <div className="flex min-w-px flex-1 items-center overflow-clip">
                <p className="truncate text-[14px] leading-5 font-semibold text-ink">
                  {title}
                </p>
              </div>
              {headerExtra}
              {onClose && (
                <IconButton
                  icon={close}
                  iconSize={16}
                  label="Close panel"
                  onClick={onClose}
                />
              )}
            </div>
          ) : null)}
        {scroll ? (
          <ScrollArea
            ref={bodyRef}
            className={bodyClassName}
            phoneFlow={phoneHeader === 'scroll'}
          >
            {children}
          </ScrollArea>
        ) : (
          <div
            className={clsx(
              'flex min-h-0 w-full flex-1 flex-col items-start',
              bodyClassName
            )}
          >
            {children}
          </div>
        )}
        {phoneHeader === 'scroll' && footer ? (
          <div className="w-full shrink-0 max-md:sticky max-md:bottom-0">
            {footer}
          </div>
        ) : (
          footer
        )}
      </motion.aside>
    </>
  );
}
