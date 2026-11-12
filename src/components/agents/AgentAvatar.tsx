import clsx from 'clsx';
import type { CSSProperties, Ref } from 'react';

import { useChangedFrom } from '@/lib/motion';

import { FittedArt } from './Character';
import { AGENT_ART, type AgentName } from './characters';

export type AgentState =
  | 'idle'
  | 'working'
  | 'hand-raised'
  | 'done'
  | 'waiting';

// Figma "Agent art / <Helper>": the helper's character fitted into a square.
export function AgentArt({
  agent,
  size = 30,
  className,
  style,
}: {
  agent: AgentName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <FittedArt
      art={AGENT_ART[agent]}
      width={size}
      height={size}
      className={className}
      style={style}
    />
  );
}

// Figma "Agent avatar" (2362:29019): a helper's character with its state badge.
// Idle, Working (···), Hand raised (red !), Done (z), Waiting (faded). Designed at 30px; every
// measurement scales with `size` (the run map uses 36.673px avatars).
export function AgentAvatar({
  agent,
  state = 'idle',
  size = 30,
  badgeText,
  motionKey,
  appeared,
  ref,
  className,
  style,
}: {
  /** It just appeared while you watched (motion): a raised hand still bounces and rings. */
  appeared?: boolean;
  agent: AgentName;
  state?: AgentState;
  size?: number;
  /** Font size / line height of the ··· and z glyphs, when an instance overrides them (Done agent: 10/14). */
  badgeText?: { size: number; leading: number };
  /** Remembers the state across beats, so a hand raised while you watch bounces once (src/lib/motion.ts). */
  motionKey?: string;
  ref?: Ref<HTMLDivElement>;
  className?: string;
  style?: CSSProperties;
}) {
  const k = size / 30;
  const changedFrom = useChangedFrom(motionKey, state);
  const raised =
    state === 'hand-raised' && (changedFrom !== undefined || !!appeared);
  const glyph: CSSProperties = {
    fontSize: badgeText?.size ?? 6.75 * k,
    lineHeight: `${badgeText?.leading ?? 6.75 * k}px`,
    letterSpacing: -0.06 * k,
  };
  const pill: CSSProperties = {
    height: 9.75 * k,
    minWidth: 11.25 * k,
    paddingInline: 1.5 * k,
    borderWidth: 0.75 * k,
  };
  return (
    <div
      ref={ref}
      className={clsx('relative shrink-0', className)}
      style={{ width: size, height: size, ...style }}
    >
      <AgentArt
        agent={agent}
        size={size}
        className={clsx(
          'absolute! inset-0',
          state === 'waiting' && 'opacity-45',
          // Thinking: a working helper breathes; a hand raised while you watch bounces once.
          state === 'working' && 'pf-breathe',
          raised && 'pf-bounce'
        )}
      />
      {(state === 'working' || state === 'done') && (
        <div
          className="absolute top-0 right-0 flex items-center justify-center rounded-full border-solid border-line-2 bg-white"
          style={state === 'done' ? { ...pill, width: 11.25 * k } : pill}
        >
          <p className="font-bold whitespace-nowrap text-ink-2" style={glyph}>
            {state === 'done' ? (
              'z'
            ) : (
              // Thinking: with motion the dots pulse in turn (three spans); still, the drawn "···" glyph run.
              <>
                <span className="pf-still">···</span>
                <span aria-hidden className="pf-dots pf-moving">
                  <span>·</span>
                  <span>·</span>
                  <span>·</span>
                </span>
              </>
            )}
          </p>
        </div>
      )}
      {raised && (
        // Its "!" sends out a ring three times.
        <span
          aria-hidden
          className="pf-ring absolute top-0 right-0"
          style={{ width: 11.25 * k, height: 11.25 * k }}
        />
      )}
      {state === 'hand-raised' && (
        <div
          className="absolute top-0 right-0 flex items-center justify-center overflow-clip rounded-full border-solid border-white bg-problem"
          style={{
            width: 11.25 * k,
            height: 11.25 * k,
            borderWidth: 0.75 * k,
            boxShadow: `0px 0px 0px ${1.421 * k}px rgba(236,59,59,0.28)`,
          }}
        >
          <p
            className="font-bold whitespace-nowrap text-white"
            style={{
              fontSize: 6.75 * k,
              lineHeight: `${6.75 * k}px`,
              letterSpacing: -0.06 * k,
            }}
          >
            !
          </p>
        </div>
      )}
    </div>
  );
}

// Figma "Alert badge" (2362:30021): red ! square on an avatar or node that needs the founder.
export function AlertBadge({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'flex size-[12.576px] items-center justify-center overflow-clip rounded-[3.144px] border-[0.629px] border-solid border-problem bg-problem shadow-[0px_0px_0px_1.192px_rgba(236,59,59,0.28)]',
        className
      )}
    >
      <p className="text-center text-[6.288px] leading-[9.432px] font-bold tracking-[-0.0503px] whitespace-nowrap text-white">
        !
      </p>
    </div>
  );
}
