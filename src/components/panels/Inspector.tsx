import clsx from 'clsx';
import type { ReactNode } from 'react';

import chevronRight from '@/assets/icons/chevron-right.svg';
import close from '@/assets/icons/close.svg';
import nodeKindOutput from '@/assets/icons/node-kind-output-glyph.svg';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';

// Node inspector pieces (Figma Panels & cards): the inspector replaces the side panel's tabbed content and
// closes with ×.

// Figma "Inspector header" (2362:30329): 24px sides, 20px top. Eyebrow row (optional 12px node-kind glyph +
// 12/18 muted kind), branch dot + label and a ghost × on the right; SemiBold 22/27.5 title; 13/18.75 muted meta.
// Figma rounds those two text boxes up to 28 and 19px; the bottom paddings carry the difference (113px tall).
export function InspectorHeader({
  eyebrow = 'Output',
  kindIcon = nodeKindOutput,
  branch,
  branchColor = 'bg-ink',
  branchTextColor = 'text-ink-2',
  title,
  meta,
  onClose,
}: {
  eyebrow?: string;
  kindIcon?: string | null;
  branch?: string;
  /** Tailwind bg class for the branch dot (fork colours: bg-fork-1…). */
  branchColor?: string;
  /** Tailwind text class for the branch label (a fork's label takes its colour: text-fork-1…). */
  branchTextColor?: string;
  title: string;
  meta: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-start px-6 pt-5 max-md:px-4">
      <div className="flex w-full items-center gap-2">
        <div className="flex shrink-0 items-center gap-1.5">
          {kindIcon && <Icon src={kindIcon} size={12} />}
          <p className="text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap text-muted">
            {eyebrow}
          </p>
        </div>
        <div className="flex min-w-px flex-1 items-start justify-end">
          <div className="flex shrink-0 items-center gap-2">
            {branch && (
              <div className="flex items-center gap-1.5">
                <span
                  className={clsx(
                    'size-1.5 shrink-0 rounded-full',
                    branchColor
                  )}
                />
                <p
                  className={clsx(
                    'text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap',
                    branchTextColor
                  )}
                >
                  {branch}
                </p>
              </div>
            )}
            {onClose && (
              <IconButton
                icon={close}
                label="Close inspector"
                onClick={onClose}
              />
            )}
          </div>
        </div>
      </div>
      <h2 className="w-full pt-2 pb-[0.5px] text-[22px] leading-[27.5px] font-semibold tracking-[-0.44px] text-ink">
        {title}
      </h2>
      <p className="w-full pt-1.5 pb-[0.25px] text-[13px] leading-[18.75px] tracking-[-0.08px] text-muted">
        {meta}
      </p>
    </div>
  );
}

// Figma "Inspector field" (2362:30346): label + value pair (Why, Based on, Impact…). 20px top spacing built in.
export function InspectorField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start pt-5">
      <p className="text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap text-muted">
        {label}
      </p>
      <div className="w-full pt-1 text-[14px] leading-[21.938px] tracking-[-0.08px] text-ink">
        {children}
      </div>
    </div>
  );
}

// Figma "Inspector action" (2362:30285): step-level action (Fork from here, Rerun from here). 1px line border,
// 10px radius, 14px padding; 36px well tile with the icon, SemiBold 13 title, 12/18 description, chevron.
// Disabled (step still running): #fafafb fill, muted text, no chevron.
export function InspectorAction({
  icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'flex w-[350px] max-w-full items-center gap-3 rounded-[10px] border border-line p-3.5 text-left',
        disabled ? 'cursor-default bg-[#fafafb]' : 'hover:bg-well'
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-well">
        <Icon src={icon} size={16} />
      </span>
      <span className="flex min-w-px flex-1 flex-col items-start">
        <span
          className={clsx(
            // h-5: Figma rounds the 19.5px title box up to 20px, which makes the action 86px tall.
            'h-5 text-[13px] leading-[19.5px] font-semibold tracking-[-0.08px] whitespace-nowrap',
            disabled ? 'text-muted' : 'text-ink'
          )}
        >
          {title}
        </span>
        <span
          className={clsx(
            'w-[244px] max-w-full text-[12px] leading-[18px] tracking-[-0.08px]',
            disabled ? 'text-[#a0a3aa]' : 'text-muted'
          )}
        >
          {description}
        </span>
      </span>
      {!disabled && <Icon src={chevronRight} size={14} />}
    </button>
  );
}
