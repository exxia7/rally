import type { ReactNode } from 'react';

// Figma "_Shortcut key" (2362:28679): 18px key cap shown inside a Button.
export function ShortcutKey({ children }: { children: ReactNode }) {
  return (
    <kbd className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-line-2 bg-white px-1 font-sans text-[11px] leading-[15.75px] font-medium tracking-[-0.08px] text-muted">
      {children}
    </kbd>
  );
}
