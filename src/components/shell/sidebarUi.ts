import { useSyncExternalStore } from 'react';

// The sidebar's own UI state, outside React so the top bar's menu button (phones) and the sidebar share it.
// - `collapsed`: on desktop (≥1280px), the 52px rail instead of the 240px sidebar. Remembered in localStorage (a
//   per-browser preference, not workflow data, so it isn't in the app store).
// - `open`: the overlay sidebar: the rail's expand under 1280px, the slide-out drawer on phones.

const KEY = 'pathfinder:sidebar';

type SidebarUi = { collapsed: boolean; open: boolean };

function readCollapsed() {
  try {
    return window.localStorage.getItem(KEY) === 'collapsed';
  } catch {
    return false;
  }
}

let ui: SidebarUi = {
  collapsed: typeof window === 'undefined' ? false : readCollapsed(),
  open: false,
};
const listeners = new Set<() => void>();

function set(patch: Partial<SidebarUi>) {
  const next = { ...ui, ...patch };
  if (next.collapsed === ui.collapsed && next.open === ui.open) return;
  if (next.collapsed !== ui.collapsed)
    try {
      window.localStorage.setItem(
        KEY,
        next.collapsed ? 'collapsed' : 'expanded'
      );
    } catch {
      // Private mode: the choice just isn't remembered.
    }
  ui = next;
  for (const fn of [...listeners]) fn();
}

export const sidebarUi = {
  setCollapsed: (collapsed: boolean) => set({ collapsed }),
  setOpen: (open: boolean) => set({ open }),
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export function useSidebarUi(): SidebarUi {
  return useSyncExternalStore(
    subscribe,
    () => ui,
    () => ui
  );
}

/** The search field's id (one sidebar panel is mounted at a time). */
export const SEARCH_ID = 'sidebar-search';

/** Focuses the sidebar search once it's on screen (⌘K, the rail's search button): the panel may still be mounting
 *  or sliding in, so it retries for a few frames. */
export function focusSearch() {
  let tries = 0;
  const tick = () => {
    const el = document.getElementById(SEARCH_ID);
    if (
      el instanceof HTMLInputElement &&
      getComputedStyle(el).visibility === 'visible'
    ) {
      el.focus();
      el.select();
    } else if (tries++ < 20) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
