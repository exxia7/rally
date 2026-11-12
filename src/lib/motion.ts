import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

// Motion helpers (CLAUDE.md "Motion"). Transitions play only on a change the viewer saw happen: a direct load paints
// the frame as drawn. Run screens swap routes between beats (3.2 re-renders the new beat, then 4.1 replaces it), so
// what was last shown is remembered here, outside React, keyed by workflow + item; a page load starts empty. A change
// stays "fresh" for REPLAY_MS, so a screen that mounts right after it still plays it.
type Seen = { value: string; prev?: string; at: number; fresh?: boolean };
const seen = new Map<string, Seen>();
const REPLAY_MS = 900;

export const reducedMotion = () =>
  typeof window === 'undefined' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

/**
 * Glide (FLIP): when a free-placed element's x/y change on the same mount, it animates from where it was to
 * where it is with a transform, so layout lands at once and nothing reflows. Off under reduced motion.
 */
export function useGlide(
  ref: RefObject<HTMLElement | null>,
  x: number,
  y: number,
  duration = 420
) {
  const last = useRef<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const prev = last.current;
    last.current = { x, y };
    const el = ref.current;
    if (!prev || !el || (prev.x === x && prev.y === y) || reducedMotion())
      return;
    el.animate(
      [
        { transform: `translate(${prev.x - x}px, ${prev.y - y}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
  }, [ref, x, y, duration]);
}
