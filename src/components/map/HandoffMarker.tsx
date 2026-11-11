import clsx from 'clsx';
import type { CSSProperties } from 'react';

import checkDim from '@/assets/icons/check-blue-dim.svg';
import check from '@/assets/icons/check-blue.svg';
import pendingDim from '@/assets/icons/handoff-pending-dim.svg';
import pending from '@/assets/icons/handoff-pending.svg';

export type HandoffStatus = 'passed' | 'pending' | 'blocked';

// Figma "Handoff marker" (2362:30119): sits on a connector between two steps, centred on the line.
// Designed at 16px; the run map draws them at 18.446px. Dimmed keeps the marker opaque.
export function HandoffMarker({
  status,
  dimmed,
  size = 16,
  className,
  style,
}: {
  status: HandoffStatus;
  dimmed?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const k = size / 16;
  const box: CSSProperties = { width: size, height: size, ...style };
  if (status === 'pending') {
    return (
      <img
        src={dimmed ? pendingDim : pending}
        alt=""
        className={clsx('shrink-0', className)}
        style={box}
      />
    );
  }
  if (status === 'blocked') {
    return (
      <div
        className={clsx(
          'flex shrink-0 items-center justify-center rounded-full',
          dimmed ? 'bg-[#f2abae]' : 'bg-problem',
          className
        )}
        style={box}
      >
        <p
          className="leading-[normal] font-bold whitespace-nowrap text-white"
          style={{ fontSize: 10 * k }}
        >
          !
        </p>
      </div>
    );
  }
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full border-solid bg-white',
        dimmed ? 'border-[#ccd8f4]' : 'border-accent-line',
        className
      )}
      style={{ ...box, borderWidth: k }}
    >
      <img
        src={dimmed ? checkDim : check}
        alt=""
        style={{ width: 7.545 * k, height: 7.545 * k }}
      />
    </div>
  );
}
