import { AnimatePresence } from 'framer-motion';
import { Fragment, type ReactNode } from 'react';

import menu from '@/assets/icons/menu.svg';
import { IconButton } from '@/components/ui/IconButton';
import { PanelEnter, useChangedFrom } from '@/lib/motion';

import { Sidebar } from './Sidebar';
import { sidebarUi } from './sidebarUi';

// Figma "Shell": 8px app-ground padding, 8px gap, sidebar + 12px-radius main panel. Frames are 1440×900; the shell
// fills the viewport so that size is exact. The sidebar (Sidebar.tsx) is 240px docked at ≥1280px, a 52px rail
// below that, and a slide-out drawer under 768px (max-md), where the main panel goes full-bleed.
export function AppShell({
  children,
  aside,
  overlay,
}: {
  children: ReactNode;
  /** Right-hand side panel (SidePanel), docked after the main panel with the 8px gap. */
  aside?: ReactNode;
  overlay?: ReactNode;
}) {
  // Motion: the side panel slides in when it opens while you watch and out when it closes (SidePanel).
  const asideFrom = useChangedFrom('shell:aside', aside ? 'open' : 'closed');
  return (
    <div className="relative flex h-dvh w-full gap-2 overflow-clip bg-app p-2 max-md:gap-0 max-md:p-0">
      <Sidebar />
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-clip rounded-card border border-line bg-white max-md:rounded-none max-md:border-0">
        {children}
      </main>
      <PanelEnter value={asideFrom === 'closed'}>
        {/* One stable key: switching panels swaps in place; only closing the slot plays SidePanel's exit. */}
        <AnimatePresence>
          {aside && <Fragment key="aside">{aside}</Fragment>}
        </AnimatePresence>
      </PanelEnter>
      {overlay}
    </div>
  );
}

// Figma "TopBar": 52px, white, bottom border, 16px horizontal padding. Under 768px it starts with the menu button
// that opens the sidebar drawer.
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
      <div className="flex min-w-0 shrink items-center">
        {/* Phones: the sidebar is a drawer, opened from here. */}
        <div className="mr-1 -ml-1.5 flex shrink-0 md:hidden">
          <IconButton
            icon={menu}
            label="Open sidebar"
            onClick={() => sidebarUi.setOpen(true)}
          />
        </div>
        {left}
      </div>
      <div className="flex min-w-fit flex-1 items-start justify-end pl-3">
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
