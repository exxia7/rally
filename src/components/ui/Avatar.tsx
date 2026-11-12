import clsx from 'clsx';

import spark from '@/assets/icons/rally-spark.svg';

import { Icon } from './Icon';

// Figma "User avatar" (2362:28648): a person's initials, 28px. Light for teammates, Dark for you.
export function UserAvatar({
  initial = 'E',
  tone = 'light',
  className,
}: {
  initial?: string;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] leading-[16.5px] font-semibold tracking-[-0.08px]',
        tone === 'light' ? 'edge bg-well text-ink-2' : 'bg-ink text-white',
        className
      )}
    >
      {initial}
    </div>
  );
}

// Figma "Pathfinder avatar" (now Rally) (2362:29001): the assistant's mark next to Rally's chat and planning messages.
// Soft blue square with the Rally spark. Screens use it at 30px.
export function RallyAvatar({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-control bg-accent-soft',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Icon src={spark} size={14.297} />
    </div>
  );
}
