import clsx from 'clsx';

// Figma "User avatar" (2362:28648): a person's initials. Light for teammates.
export function UserAvatar({
  initial = 'E',
  className,
}: {
  initial?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex size-7 shrink-0 items-center justify-center edge rounded-full bg-well text-[11px] leading-[16.5px] font-semibold tracking-[-0.08px] text-ink-2',
        className
      )}
    >
      {initial}
    </div>
  );
}
