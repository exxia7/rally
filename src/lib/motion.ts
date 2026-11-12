import {
  animate,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
  type Transition,
  type Variants,
} from 'framer-motion';
import {
  createContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

// Shared motion for the whole app, on framer-motion (CLAUDE.md "Motion"). Components import the timings, variants
// and hooks from here, and the ready-made pieces (<FadePresence>, <Pop>, <SlidePanel>, <Sheet>, <Expand>, <Rise>,
// <TickText>, <ThinkingDots>) from src/components/motion/Motion.tsx. Two rules:
// - Reduced motion: <MotionRoot> (main.tsx) sets <MotionConfig reducedMotion="user">, and every piece here also
//   turns its own opacity fades and loops off (`useMotionOn`), so under prefers-reduced-motion nothing moves.
// - First paint: a direct load paints its frame still. One-shots play only for a change the viewer saw: overlays
//   opened after the app's first paint (`useEnter`), and run/plan map changes remembered below across the route
//   swaps between beats (`useChangedFrom`, `useAdded`).

// ---- Timings ------------------------------------------------------------------------------------------------
/** The app's ease-out (CSS cubic-bezier(0.22, 1, 0.36, 1)). */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Seconds: fast 150ms (menus, ticks), base 240ms (panels, fades), slow 450ms (cross-fades, rises), draw 600ms. */
export const DURATION = {
  fast: 0.15,
  base: 0.24,
  slow: 0.45,
  draw: 0.6,
} as const;

export const transitions = {
  fast: { duration: DURATION.fast, ease: EASE_OUT },
  base: { duration: DURATION.base, ease: EASE_OUT },
  slow: { duration: DURATION.slow, ease: EASE_OUT },
  draw: { duration: DURATION.draw, ease: 'easeOut' },
  /** Moves (cards gliding to a new place): a critically damped spring, ~400ms, no overshoot. */
  glide: { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 },
  /** Pop-ins (a handoff check, a helper appearing): a spring with a small overshoot. */
  pop: { type: 'spring', stiffness: 520, damping: 22 },
  instant: { duration: 0 },
} satisfies Record<string, Transition>;

/** Shared variants: every one has `hidden` and `shown` (use initial="hidden" animate="shown" exit="hidden"). */
export const variants = {
  fadeIn: { hidden: { opacity: 0 }, shown: { opacity: 1 } },
  rise: { hidden: { opacity: 0, y: 6 }, shown: { opacity: 1, y: 0 } },
  pop: { hidden: { opacity: 0, scale: 0.4 }, shown: { opacity: 1, scale: 1 } },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.97 },
    shown: { opacity: 1, scale: 1 },
  },
  slideInRight: { hidden: { opacity: 0, x: 24 }, shown: { opacity: 1, x: 0 } },
  slideInLeft: { hidden: { opacity: 0, x: -24 }, shown: { opacity: 1, x: 0 } },
  sheetUp: { hidden: { y: '100%' }, shown: { y: 0 } },
  drawIn: { hidden: { pathLength: 0 }, shown: { pathLength: 1 } },
} satisfies Record<string, Variants>;

// ---- Reduced motion and first paint ------------------------------------------------------------------------
export const reducedMotion = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** False under prefers-reduced-motion: skip loops and make one-shots instant. */
export function useMotionOn() {
  return !useReducedMotion();
}

/** `t`, or an instant transition under reduced motion. */
export function useTransition(t: Transition): Transition {
  return useMotionOn() ? t : transitions.instant;
}

let painted = false;
/** Called once by <MotionRoot> after the app's first paint. */
export function markPainted() {
  painted = true;
}

/**
 * Whether this mount should animate in: true when it mounts after the app's first paint (opened by the viewer or
 * the run) and motion is on. Fixed for the life of the mount. Use as `initial={enter ? 'hidden' : false}`.
 */
export function useEnter(when = true) {
  const [enter] = useState(() => when && painted && !reducedMotion());
  return enter;
}

/**
 * Set by AppShell around its `aside`: true when the side panel slot just went from empty to filled while the viewer
 * watched (this screen or the one before a route swap), so SidePanel slides in. A direct load paints it docked.
 */
export const PanelEnter = createContext(false);

// ---- Memory of what the viewer saw (run and plan maps) -------------------------------------------------------
// Run screens swap routes between beats (3.2 re-renders the new beat, then 4.1 replaces it), so what was last shown is
// remembered here, outside React, keyed by workflow + item; a page load starts empty. A change stays "fresh" for
// REPLAY_MS, so a screen that mounts right after it still plays it.
type Seen = { value: string; prev?: string; at: number; fresh?: boolean };
const seen = new Map<string, Seen>();
const REPLAY_MS = 900;

const recent = (e: Seen | undefined) => !!e && Date.now() - e.at < REPLAY_MS;

/**
 * The value `key` showed before it changed to `value`, if the viewer saw that change (this mount or one that just
 * unmounted); undefined on first sight. Stable until the value changes again, so a re-render doesn't cut an animation.
 */
export function useChangedFrom(
  key: string | undefined,
  value: string
): string | undefined {
  const [s, setS] = useState(() => {
    const e = key === undefined ? undefined : seen.get(key);
    const prev =
      e && e.value !== value
        ? e.value
        : e && recent(e) && e.prev !== value
          ? e.prev
          : undefined;
    return { value, prev };
  });
  let cur = s;
  if (s.value !== value) {
    cur = { value, prev: s.value };
    setS(cur);
  }
  useEffect(() => {
    if (key === undefined) return;
    const e = seen.get(key);
    if (!e) seen.set(key, { value, at: 0 });
    else if (e.value !== value)
      seen.set(key, { value, prev: e.value, at: Date.now() });
  }, [key, value]);
  return key === undefined ? undefined : cur.prev;
}

type Members = { ids: Set<string>; added: Set<string>; at: number };
const members = new Map<string, Members>();

/**
 * Which of `ids` (a map's cards, lines, a tray's helpers) appeared since `scope` was last shown: added while you
 * watched, restored, or changed while you were on another screen. Empty on the scope's first paint.
 */
export function useAdded(
  scope: string | undefined,
  ids: string[]
): Set<string> {
  const sig = ids.join('|');
  const [s, setS] = useState(() => {
    const e = scope === undefined ? undefined : members.get(scope);
    let added = new Set<string>();
    if (e) {
      added = new Set(ids.filter((id) => !e.ids.has(id)));
      if (!added.size && Date.now() - e.at < REPLAY_MS)
        added = new Set(ids.filter((id) => e.added.has(id)));
    }
    return { sig, ids: new Set(ids), added };
  });
  let cur = s;
  if (s.sig !== sig) {
    cur = {
      sig,
      ids: new Set(ids),
      added: new Set(ids.filter((id) => !s.ids.has(id))),
    };
    setS(cur);
  }
  useEffect(() => {
    if (scope === undefined) return;
    const now = new Set(sig ? sig.split('|') : []);
    const e = members.get(scope);
    if (!e) members.set(scope, { ids: now, added: new Set(), at: 0 });
    else if (e.ids.size !== now.size || [...now].some((id) => !e.ids.has(id)))
      members.set(scope, {
        ids: now,
        added: new Set([...now].filter((id) => !e.ids.has(id))),
        at: Date.now(),
      });
  }, [scope, sig]);
  return scope === undefined ? NONE : cur.added;
}
const NONE = new Set<string>();

// ---- Glides ---------------------------------------------------------------------------------------------------
/**
 * Glide (FLIP with a spring): a free-placed element keeps its left/top; when its x/y change on the same mount, the
 * returned motion values jump to the old offset and spring back to 0, so layout lands at once and only the
 * transform moves. Pass them as `style={{ x, y }}` on a motion element. At rest they are 0 (no transform).
 */
export function useGlide(
  x: number,
  y: number
): { x: MotionValue<number>; y: MotionValue<number> } {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const prev = last.current;
    last.current = { x, y };
    if (!prev || (prev.x === x && prev.y === y) || reducedMotion()) return;
    mx.set(mx.get() + prev.x - x);
    my.set(my.get() + prev.y - y);
    const a = animate(mx, 0, transitions.glide);
    const b = animate(my, 0, transitions.glide);
    return () => {
      a.stop();
      b.stop();
    };
  }, [x, y, mx, my]);
  return { x: mx, y: my };
}
