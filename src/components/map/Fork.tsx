import fork1 from '@/assets/icons/fork-1.svg';
import fork2 from '@/assets/icons/fork-2.svg';
import fork3 from '@/assets/icons/fork-3.svg';
import forkWhite from '@/assets/icons/fork-white.svg';

import { FORK_COLOR, type ForkNumber } from './forks';

const FORK_ICON: Record<ForkNumber, string> = { 1: fork1, 2: fork2, 3: fork3 };

// Figma "Fork pill" (2362:30132): marks where a fork leaves the original path, on the line.
export function ForkPill({
  fork = 1,
  label = `Fork ${fork}`,
}: {
  fork?: ForkNumber;
  label?: string;
}) {
  return (
    <div
      className="flex items-center gap-[3px] overflow-clip rounded-full py-0.5 pr-1.5 pl-[5px]"
      style={{ backgroundColor: FORK_COLOR[fork] }}
    >
      <img src={forkWhite} alt="" className="size-[9px] shrink-0" />
      <p className="text-[8px] leading-[normal] font-semibold whitespace-nowrap text-white">
        {label}
      </p>
    </div>
  );
}

// Figma "Fork label" (2362:30142): title of a fork lane on the canvas, in the fork's colour.
export function ForkLabel({
  fork = 1,
  label = `Fork ${fork} · running`,
}: {
  fork?: ForkNumber;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-1 overflow-clip">
      <img src={FORK_ICON[fork]} alt="" className="size-[11px] shrink-0" />
      <p
        className="text-[9px] leading-[normal] font-semibold whitespace-nowrap"
        style={{ color: FORK_COLOR[fork] }}
      >
        {label}
      </p>
    </div>
  );
}
