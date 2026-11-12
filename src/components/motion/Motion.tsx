import {
  AnimatePresence,
  MotionConfig,
  motion,
  type HTMLMotionProps,
  type Transition,
} from 'framer-motion';
import { useEffect, type ReactNode } from 'react';

import {
  markPainted,
  transitions,
  useEnter,
  useMotionOn,
  useTransition,
  variants,
} from '@/lib/motion';

// Ready-made motion pieces (CLAUDE.md "Motion"). Timings and variants come from src/lib/motion.ts. Each one plays
// nothing on a direct load's first paint, animates what the viewer opens after that, and is instant (opacity too)
// under prefers-reduced-motion.

type Variant = keyof typeof variants;

/** The app root: reduced motion respected everywhere, and the first paint recorded for `useEnter`. */
export function MotionRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(markPainted);
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

type PresenceProps = {
  /** Shown or not: it animates in and out as this changes. */
  show: boolean;
  children: ReactNode;
  className?: string;
  /** Default `fadeIn` (FadePresence) / `scaleIn` (Pop). */
  variant?: Variant;
  transition?: Transition;
} & Omit<HTMLMotionProps<'div'>, 'children' | 'transition'>;

/**
 * Fades (or another shared variant) a block in and out with AnimatePresence: scrims, toasts, empty states, a modal's
 * frame. `show` false unmounts it after the exit.
 */
export function FadePresence({
  show,
  children,
  className,
  variant = 'fadeIn',
  transition = transitions.base,
  ...rest
}: PresenceProps) {
  const appear = useEnter();
  const t = useTransition(transition);
  return (
    <AnimatePresence initial={appear}>
      {show && (
        <motion.div
          key="presence"
          className={className}
          variants={variants[variant]}
          initial="hidden"
          animate="shown"
          exit="hidden"
          transition={t}
          {...rest}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A popover, menu or dialog box: scales up from 97% and fades in (150ms); with `show`, it also scales out. Without
 * `show` it only plays its entrance (for a parent that mounts it conditionally). `origin` is the transform origin
 * (the side it grows from, e.g. "top left" for a menu under its button).
 */
export function Pop({
  show,
  origin = 'top',
  children,
  className,
  style,
  transition = transitions.fast,
  ...rest
}: Omit<PresenceProps, 'show' | 'variant'> & {
  show?: boolean;
  origin?: string;
}) {
  const enter = useEnter();
  const t = useTransition(transition);
  const box = (
    <motion.div
      key="pop"
      className={className}
      variants={variants.scaleIn}
      initial={enter ? 'hidden' : false}
      animate="shown"
      exit="hidden"
      transition={t}
      style={{ transformOrigin: origin, ...style }}
      {...rest}
    >
      {children}
    </motion.div>
  );
  if (show === undefined) return box;
  return <AnimatePresence initial={enter}>{show && box}</AnimatePresence>;
}

/**
 * A drawer or panel that slides in from the `side` (24px, with a fade) and back out when `open` turns false. The
 * side panel (SidePanel) and the sidebar drawer use it.
 */
export function SlidePanel({
  open,
  side = 'right',
  children,
  className,
  transition = transitions.base,
  ...rest
}: Omit<PresenceProps, 'show' | 'variant'> & {
  open: boolean;
  side?: 'right' | 'left';
}) {
  const appear = useEnter();
  const t = useTransition(transition);
  return (
    <AnimatePresence initial={appear}>
      {open && (
        <motion.div
          key="panel"
          className={className}
          variants={
            side === 'right' ? variants.slideInRight : variants.slideInLeft
          }
          initial="hidden"
          animate="shown"
          exit="hidden"
          transition={t}
          {...rest}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A bottom sheet (phones): slides up from below the screen and back down when `open` turns false. */
export function Sheet({
  open,
  children,
  className,
  transition = transitions.base,
  ...rest
}: Omit<PresenceProps, 'show' | 'variant'> & { open: boolean }) {
  const appear = useEnter();
  const t = useTransition(transition);
  return (
    <AnimatePresence initial={appear}>
      {open && (
        <motion.div
          key="sheet"
          className={className}
          variants={variants.sheetUp}
          initial="hidden"
          animate="shown"
          exit="hidden"
          transition={t}
          {...rest}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Expand / collapse to the content's height (`height: auto`) with a fade, 220ms ease-out: dropdown bodies,
 * accordions, the Tasks list. Unmounts the content when closed.
 */
export function Expand({
  open,
  children,
  className,
  transition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  ...rest
}: Omit<PresenceProps, 'show' | 'variant'> & { open: boolean }) {
  const appear = useEnter();
  const t = useTransition(transition);
  return (
    <AnimatePresence initial={appear}>
      {open && (
        <motion.div
          key="expand"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={t}
          className={className}
          {...rest}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Rises 6px and fades in on mount (450ms): a new chat message, a card that appears. `play` overrides when it should
 * (default: any mount after the first paint).
 */
export function Rise({
  play,
  children,
  className,
  transition = transitions.slow,
  ...rest
}: Omit<HTMLMotionProps<'div'>, 'children' | 'transition'> & {
  play?: boolean;
  children: ReactNode;
  transition?: Transition;
}) {
  const enter = useEnter(play ?? true);
  const t = useTransition(transition);
  return (
    <motion.div
      className={className}
      variants={variants.rise}
      initial={enter ? 'hidden' : false}
      animate="shown"
      transition={t}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Text that changes in place ("3 of 9 done" → "4 of 9 done", "Rerunning"): the old and new text cross-fade, opacity
 * only, so neither drifts off the row's baseline (popLayout, so the row doesn't jump). `play` also animates the first
 * mount (a change seen just before a route swap).
 */
export function TickText({
  text,
  play,
  className,
}: {
  text: string;
  play?: boolean;
  className?: string;
}) {
  const t = useTransition(transitions.base);
  return (
    <AnimatePresence mode="popLayout" initial={!!play}>
      <motion.span
        key={text}
        className={className}
        style={{ display: 'inline-block' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={t}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
}

/**
 * Three dots that pulse in turn (1.4s loop): "thinking" on a working helper's badge and the chat typing row. Each
 * dot is `char` (text) or an empty span styled by `dotClassName`. Under reduced motion it renders `still` (the
 * drawn glyph) when given, else the dots without motion.
 */
export function ThinkingDots({
  className,
  dotClassName,
  char,
  still,
}: {
  className?: string;
  dotClassName?: string;
  char?: string;
  still?: ReactNode;
}) {
  const on = useMotionOn();
  if (!on && still !== undefined) return <>{still}</>;
  return (
    <span aria-hidden className={className}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={dotClassName}
          animate={on ? { opacity: [1, 0.25, 1, 1] } : undefined}
          transition={
            on
              ? {
                  duration: 1.4,
                  times: [0, 0.3, 0.6, 1],
                  ease: 'easeInOut',
                  repeat: Infinity,
                  delay: i * 0.18,
                }
              : undefined
          }
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}
