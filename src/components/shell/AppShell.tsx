import type { ReactNode } from 'react';

import { Sidebar } from './Sidebar';

// Figma "Shell": 8px app-ground padding, 8px gap, 52px sidebar + 12px-radius main panel. Frames are 1440×900.
export function AppShell({
  children,
  sidebar = 'workflows',
  overlay,
}: {
  children: ReactNode;
  sidebar?: 'workflows' | 'settings' | 'none';
  overlay?: ReactNode;
}) {
  return (
    <div className="relative flex h-[900px] w-[1440px] gap-2 bg-app p-2">
      <Sidebar active={sidebar} />
      <main className="relative flex h-[884px] min-w-px flex-1 flex-col overflow-clip rounded-card border border-line bg-white">
        {children}
      </main>
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
      className={`relative flex h-[52px] w-full shrink-0 items-center edge-b bg-white px-4 ${className ?? ''}`}
    >
      <div className="flex shrink-0 items-center">{left}</div>
      <div className="flex min-w-px flex-1 items-start justify-end">
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
