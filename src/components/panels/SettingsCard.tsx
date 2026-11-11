import clsx from 'clsx';
import type { ReactNode } from 'react';

import { Icon } from '@/components/ui/Icon';

// Settings page card (frame 1.2 "Workspace settings", e.g. 2362:23364): white, 1px line border (in layout),
// 12px radius, 20px padding, faint drop shadow. SemiBold 14/21 title, 12/18 muted subtitle (2px above it),
// then the card body. `subtitle` is optional (2.8 Budget, Approvers); `subtitleWrap` lets a long one take
// two lines instead of the fixed 20px box (2.8 Launch facts).
export function SettingsCard({
  title,
  subtitle,
  subtitleWrap,
  children,
  className,
  id,
}: {
  title: string;
  subtitle?: string;
  subtitleWrap?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={clsx(
        'flex w-full shrink-0 scroll-mt-6 flex-col items-start rounded-card border border-line bg-white p-5 drop-shadow-[0px_1px_1px_rgba(16,18,24,0.04)]',
        className
      )}
    >
      <h2 className="text-[14px] leading-[21px] font-semibold tracking-[-0.08px] whitespace-nowrap text-ink">
        {title}
      </h2>
      {subtitle && (
        <p
          className={clsx(
            'flex w-full items-start pt-0.5 text-[12px] leading-[18px] tracking-[-0.08px] text-muted',
            !subtitleWrap && 'h-5 max-md:h-auto'
          )}
        >
          {subtitle}
        </p>
      )}
      {children}
    </section>
  );
}

// Name over an 11/16.5 muted description; the name box is 20px tall as Figma rounds 19.5px text up.
export function SettingName({
  name,
  description,
  weight = 'medium',
  descriptionClassName,
  className,
}: {
  name: ReactNode;
  description?: ReactNode;
  weight?: 'medium' | 'regular';
  descriptionClassName?: string;
  className?: string;
}) {
  return (
    <div className={clsx('flex min-w-px flex-1 flex-col items-start', className)}>
      <p
        className={clsx(
          'h-5 text-[13px] leading-[19.5px] tracking-[-0.08px] whitespace-nowrap text-ink',
          weight === 'medium' && 'font-medium'
        )}
      >
        {name}
      </p>
      {description && (
        <p
          className={clsx(
            'w-full pt-0.5 text-[11px] leading-[16.5px] tracking-[-0.08px] text-muted',
            descriptionClassName
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

// Grey row inside a settings card (presets, brand assets): well fill, 12px radius, 14px sides, 12px gap.
export function SettingsWellRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex w-full shrink-0 items-center gap-3 rounded-card bg-well px-3.5',
        className
      )}
    >
      {children}
    </div>
  );
}

// Text action under a list ("+ New preset", "+ Invite"): 14px icon, 4px gap, Medium 12/18 ink.
export function SettingsLinkButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[18px] items-center gap-1 rounded-[4px] text-center text-[12px] leading-[18px] font-medium tracking-[-0.08px] whitespace-nowrap text-ink hover:text-accent"
    >
      <Icon src={icon} size={14} />
      {label}
    </button>
  );
}
