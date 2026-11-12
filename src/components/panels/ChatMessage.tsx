import clsx from 'clsx';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { AgentArt } from '@/components/agents/AgentAvatar';
import type { AgentName } from '@/components/agents/characters';
import { ThinkingDots } from '@/components/motion/Motion';
import { PathfinderAvatar } from '@/components/ui/Avatar';
import { transitions, useEnter, variants } from '@/lib/motion';

// One set of chat components for every chat surface: the plan's main-column chat (2.1 → 2.2, 2362:23566,
// `density="main"`) and the side panel's Chat (plan 2.3–2.8, 2362:23715; the run Chat tab: `density="panel"`).
//
// - <Message from="assistant">: the Pathfinder avatar, then a white bubble (1px line border, 10px corners with a
//   sharp top-left). <Message from="user">: a well bubble on the right with a sharp top-right corner.
// - Bubbles hug their text up to a max width (assistant: the thread width less the avatar, 420px in the main column;
//   user: 400px main / 280px panel, and never more than 85% of the thread), wrap, keep explicit "\n" line breaks
//   and break long words and URLs. No fixed widths, no nowrap.
// - <Thread>: the message column. <TypingRow>: the helper that's working, at the foot of a thread.
//
// Figma's values per density:
//   main:  30px avatar 12px from the bubble; 13px text (21.125 assistant / 19.5 user line height); 16/12 padding
//          (assistant), 16/10 (user, 1px line border); 6px sharp corner; 16px between messages. `children` sit 16px
//          under the bubble, aligned with it (the "See your team" button).
//   panel: 26px avatar 8px from the bubble; 12.5px text (20.313 / 18.75); 12/10 padding (assistant), 12/8 (user,
//          no border); 5px sharp corner; 12px between messages. `children` sit inside the bubble, 8px under the
//          text (2.4d's Undo).
export type ChatDensity = 'main' | 'panel';

const STYLE = {
  main: {
    avatar: 30,
    row: 'gap-3',
    assistant: 'max-w-[420px] rounded-tl-[6px] px-4 py-3',
    assistantText: 'text-[13px] leading-[21.125px]',
    user: 'max-w-[min(400px,85%)] rounded-tr-[6px] border border-line px-4 py-2.5',
    userText: 'text-[13px] leading-[19.5px]',
  },
  panel: {
    avatar: 26,
    row: 'gap-2',
    assistant: 'rounded-tl-[5px] px-3 py-2.5',
    assistantText: 'text-[12.5px] leading-[20.313px]',
    user: 'max-w-[min(280px,85%)] rounded-tr-[5px] px-3 py-2',
    userText: 'text-[12.5px] leading-[18.75px]',
  },
} as const;

const TEXT = 'tracking-[-0.08px] whitespace-pre-line wrap-break-word text-ink';

export function Message({
  from,
  text,
  density = 'panel',
  children,
  className,
  bubbleClassName,
  enter,
}: {
  /** Motion: a message that arrives while you watch rises in (450ms; never on a first paint). */
  enter?: boolean;
  from: 'assistant' | 'user';
  text: ReactNode;
  density?: ChatDensity;
  /** Assistant only: under the text (inside the bubble in the panel, under it in the main column). */
  children?: ReactNode;
  /** On the message row. */
  className?: string;
  /** On the bubble (2.2 rings the brief the launch facts came from). */
  bubbleClassName?: string;
}) {
  const s = STYLE[density];
  const rise = {
    variants: variants.rise,
    initial: useEnter(!!enter) ? ('hidden' as const) : false,
    animate: 'shown',
    transition: transitions.slow,
  };
  if (from === 'user')
    return (
      <motion.div
        {...rise}
        className={clsx('flex w-full shrink-0 justify-end', className)}
      >
        <div
          className={clsx(
            'min-w-0 rounded-[10px] bg-well',
            s.user,
            bubbleClassName
          )}
        >
          <p className={clsx(TEXT, s.userText)}>{text}</p>
        </div>
      </motion.div>
    );
  const inside = density === 'panel';
  return (
    <motion.div
      {...rise}
      className={clsx(
        'flex w-full shrink-0 flex-col items-start gap-4',
        className
      )}
    >
      <div className={clsx('flex w-full items-start', s.row)}>
        <PathfinderAvatar size={s.avatar} />
        <div
          className={clsx(
            'flex min-w-0 flex-col items-start rounded-[10px] border border-line bg-white',
            s.assistant,
            bubbleClassName
          )}
        >
          <p className={clsx(TEXT, s.assistantText)}>{text}</p>
          {inside && children && (
            <div className="flex w-full flex-col items-start pt-2">
              {children}
            </div>
          )}
        </div>
      </div>
      {!inside && children && (
        <div className="flex w-full flex-col items-start pl-[42px]">
          {children}
        </div>
      )}
    </motion.div>
  );
}

// The message column. main: 620px max, 32px top / 16px bottom, 16px between messages (16px sides on phones).
// panel: 24px sides (16 on phones), 8px top / 16px bottom, 12px between messages. `inset="narrow"`: the 300px
// left chat column of 2.4c (16px sides, no top padding).
export function Thread({
  children,
  density = 'panel',
  inset,
  className,
}: {
  children: ReactNode;
  density?: ChatDensity;
  inset?: 'narrow';
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex w-full flex-col items-start',
        density === 'main'
          ? 'max-w-[620px] gap-4 pt-8 pb-4 max-md:px-4'
          : 'gap-3 pb-4',
        density === 'panel' &&
          (inset === 'narrow' ? 'px-4' : 'px-6 pt-2 max-md:px-4'),
        className
      )}
    >
      {children}
    </div>
  );
}

// Someone working at the foot of a thread: a helper in the run Chat tab ("Writer is working", its character in the
// avatar's place) or the Planner in 2.2 while it thinks of a reply (no `agent`: the Pathfinder avatar). Then an
// assistant-style bubble with three dots that pulse in turn (ThinkingDots; still under reduced motion) and the label.
// Keyed by the screen on who is working, so it changes (and rises in) as that moves on. Same density values as
// Message: 26px avatar 8px from the bubble in the panel, 30px and 12px in the main column.
export function TypingRow({
  agent,
  name,
  label = `${name} is working`,
  density = 'panel',
  className,
}: {
  agent?: AgentName;
  name: string;
  /** Default "<name> is working". */
  label?: string;
  density?: ChatDensity;
  className?: string;
}) {
  const enter = useEnter();
  const s = STYLE[density];
  return (
    <motion.div
      className={clsx('flex w-full shrink-0 items-center', s.row, className)}
      role="status"
      variants={variants.rise}
      initial={enter ? 'hidden' : false}
      animate="shown"
      transition={transitions.slow}
    >
      {agent ? (
        <AgentArt agent={agent} size={s.avatar} />
      ) : (
        <PathfinderAvatar size={s.avatar} />
      )}
      <div
        className={clsx(
          'flex min-w-0 items-center gap-2 rounded-[10px] border border-line bg-white px-3 py-2',
          density === 'main' ? 'rounded-tl-[6px]' : 'rounded-tl-[5px]'
        )}
      >
        <ThinkingDots
          className="flex shrink-0 items-center gap-[3px]"
          dotClassName="size-1 rounded-full bg-muted"
        />
        <span className="truncate text-[12px] leading-[18px] text-muted">
          {label}
        </span>
      </div>
    </motion.div>
  );
}
