import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

import { TickText } from '@/components/motion/Motion';
import {
  reducedMotion,
  transitions,
  useAdded,
  useChangedFrom,
  useMotionOn,
  variants,
} from '@/lib/motion';

import { AgentAvatar } from './AgentAvatar';
import type { AgentName } from './characters';

// Figma's widths for each Done agent (its name box rounds up wider than Chrome's text).
const DONE_AGENT_W: Record<AgentName, number> = {
  Planner: 36,
  Scout: 30,
  Insights: 37,
  Strategist: 46,
  Writer: 30,
  Designer: 42,
  Community: 54,
  Publisher: 44,
};

// Figma "Done agent" (2362:29175): avatar (Done) + name.
export function DoneAgent({
  agent,
  name,
  isNew,
}: {
  agent: AgentName;
  name?: string;
  /** Motion: it just finished, so it slides into the tray (from the map above it). */
  isNew?: boolean;
}) {
  const on = useMotionOn();
  return (
    <motion.div
      layout="position"
      className="flex shrink-0 flex-col items-center gap-0.5"
      style={{ minWidth: DONE_AGENT_W[agent] }}
      initial={
        on && isNew ? { opacity: 0, x: -10, y: -14, scale: 0.85 } : false
      }
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={on ? transitions.slow : transitions.instant}
    >
      <AgentAvatar
        agent={agent}
        state="done"
        badgeText={{ size: 10, leading: 14 }}
      />
      <p
        title={name ?? agent}
        className="max-w-20 truncate pt-px text-[10px] leading-[14px] tracking-[-0.0503px] text-muted"
      >
        {name ?? agent}
      </p>
    </motion.div>
  );
}

// Whether a sideways scroller has content hidden to its left / right (for the edge fades).
function useSideEdges(ref: RefObject<HTMLElement | null>, items: number) {
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 0;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((e) =>
      e.left === left && e.right === right ? e : { left, right }
    );
  }, [ref]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [ref, measure, items]);
  return edges;
}

// Figma "Completed agents" (2362:30097): bottom-left canvas tray of finished helpers. Place 16px from the canvas left
// and bottom. Hidden until a helper finishes (it fades in with the first one). Never under the zoom controls pinned
// bottom-right (about 172px + 16px in, plus a 16px gap): when the helpers don't fit, they scroll sideways under the
// label, with a fade at the cut, and a helper that finishes scrolls into view. Phones move the zoom controls above
// it, so it takes the full width there.
export function CompletedAgents({
  agents,
  names,
  label,
  motionKey,
  className,
}: {
  /** Remembers who was in the tray across beats (src/lib/motion.ts). */
  motionKey?: string;
  agents: AgentName[];
  /** Renamed helpers: character → the name you gave it. */
  names?: Partial<Record<AgentName, string>>;
  label?: string;
  className?: string;
}) {
  const on = useMotionOn();
  const added = useAdded(motionKey, agents);
  const text =
    label ??
    `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'} done`;
  const textFrom = useChangedFrom(motionKey && `${motionKey}:label`, text);
  const scroller = useRef<HTMLDivElement>(null);
  const edges = useSideEdges(scroller, agents.length);
  // A helper that just finished slides in at the end: keep it in view.
  const count = agents.length;
  const lastCount = useRef(count);
  useEffect(() => {
    const el = scroller.current;
    if (el && count > lastCount.current)
      el.scrollTo({
        left: el.scrollWidth,
        behavior: reducedMotion() ? 'auto' : 'smooth',
      });
    lastCount.current = count;
  }, [count]);
  const show = agents.length > 0 || label !== undefined;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="tray"
          variants={variants.rise}
          initial="hidden"
          animate="shown"
          exit="hidden"
          transition={on ? transitions.slow : transitions.instant}
          className={clsx(
            'flex max-w-[calc(100%-220px)] items-center gap-2.5 rounded-[10px] border border-line bg-white pt-2 pr-3 pb-1.5 pl-3.5 max-md:max-w-[calc(100%-32px)]',
            className
          )}
        >
          <p className="min-w-[83px] shrink-0 text-[12px] leading-[18px] font-semibold tracking-[-0.0503px] whitespace-nowrap text-ink">
            <TickText text={text} play={textFrom !== undefined} />
          </p>
          {agents.length > 0 && (
            <>
              <div className="h-7 w-px shrink-0 bg-line" />
              <div className="relative flex min-w-0 items-center">
                <div
                  ref={scroller}
                  className="flex min-w-0 items-center gap-2.5 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <AnimatePresence initial={false}>
                    {agents.map((a) => (
                      <DoneAgent
                        key={a}
                        agent={a}
                        name={names?.[a]}
                        isNew={added.has(a)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {edges.left && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent"
                  />
                )}
                {edges.right && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent"
                  />
                )}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
