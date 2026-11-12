import clsx from 'clsx';
import { useEffect, type ReactNode } from 'react';

import close from '@/assets/icons/close.svg';
import { IconButton } from '@/components/ui/IconButton';

// The right-hand side panel (Figma "Artifact panel", e.g. 2362:23590; Chat · Sandbox · Decisions, inspector,
// drawers): 400px, white, 1px line border, 12px radius, docked beside the main panel with the shell's 8px gap.
// Title header (plan, 2362:23591): 52px, 1px bottom line, 16px left / 10px right padding, SemiBold 14/20 title, ghost ×.
// Tabs header (run, 2362:25046): underline Panel tabs at 24px sides, 4px top, on a 1px bottom line; on desktop the
// top bar's panel toggle closes it, so its × only shows under 1280px.
// Pass it to AppShell's `aside`. Under 1280px it floats over the right of the content with a shadow, and the
// content stays usable (no scrim: you can click map blocks into the chat); under 768px it is a full-screen sheet.
// `header` replaces the built-in headers (the inspector's own header); `footer` is pinned under the scrolling body
// (the inspector's Edit / I'll do this one bar).
// `sheet="half"` (hand-raise, inspector, approval): under 768px a bottom sheet 56% of the screen tall instead of a
// full-screen one, so the top bar's status pill and the card it's about stay in view above it.
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
}: {
  sheet?: 'full' | 'half';
  title?: ReactNode;
  tabs?: ReactNode;
  onClose?: () => void;
  headerExtra?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
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
  return (
    <>
      <aside
        className={clsx(
          'flex h-full w-[400px] shrink-0 flex-col items-start overflow-clip rounded-card border border-line bg-white',
          'max-xl:absolute max-xl:inset-y-2 max-xl:right-2 max-xl:z-40 max-xl:h-auto max-xl:max-w-[calc(100%-16px)] max-xl:shadow-[0px_8px_32px_0px_rgba(0,0,0,0.16)]',
          'max-md:fixed max-md:inset-0 max-md:w-full max-md:max-w-none max-md:rounded-none max-md:border-0',
          sheet === 'half' &&
            'max-md:top-auto max-md:h-[56dvh] max-md:rounded-t-[16px] max-md:shadow-[0px_-8px_32px_0px_rgba(0,0,0,0.16)]',
          className
        )}
      >
        {header ??
          (tabs ? (
            <div className="flex w-full shrink-0 items-center gap-2 border-b border-line px-6 pt-1 max-md:px-4">
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
        <div
          className={clsx(
            'flex min-h-px w-full flex-1 flex-col items-start overflow-y-auto',
            bodyClassName
          )}
        >
          {children}
        </div>
        {footer}
      </aside>
    </>
  );
}
