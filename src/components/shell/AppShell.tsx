import type { ReactNode } from 'react';

import { Sidebar } from './Sidebar';

// Figma "Shell": 8px app-ground padding, 8px gap, 52px sidebar + 12px-radius main panel. Frames are 1440×900;
// the shell fills the viewport so that size is exact. Under 768px (max-md) the sidebar becomes a bottom tab
// bar and the main panel goes full-bleed.
export function AppShell({
  children,
  sidebar = 'workflows',
  aside,
  overlay,
}: {
  children: ReactNode;
  sidebar?: 'workflows' | 'settings' | 'none';
  /** Right-hand side panel (SidePanel), docked after the main panel with the 8px gap. */
  aside?: ReactNode;
  overlay?: ReactNode;
}) {
  return (
    <div className="relative flex h-dvh w-full gap-2 overflow-clip bg-app p-2 max-md:flex-col-reverse max-md:gap-0 max-md:p-0">
      <Sidebar active={sidebar} />
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-clip rounded-card border border-line bg-white max-md:rounded-none max-md:border-0">
        {children}
      </main>
      {aside}
      {overlay}
    </div>
  );
}

// Figma "TopBar": 52px, white, bottom border, 16px horizontal padding.
export function TopBar({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`relative flex h-[52px] w-full shrink-0 items-center edge-b bg-white px-4 max-md:px-3 ${className ?? ''}`}
    >
      <div className="flex min-w-0 shrink items-center">{left}</div>
      <div className="flex min-w-px flex-1 items-start justify-end max-xl:min-w-fit">
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
