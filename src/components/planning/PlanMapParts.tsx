import clsx from 'clsx';

import diamondBlue from '@/assets/icons/diamond-blue.svg';
import diamondDark from '@/assets/icons/diamond-dark.svg';
import plusWhite from '@/assets/icons/plus-white-14.svg';
import helperGlyph from '@/assets/icons/step-kind-helper.svg';

// Figma "Stage label" (2362:29462): numbered column header on the plan map (1 Research, 2 Decide…).
export function StageLabel({
  number,
  label,
  className,
}: {
  number: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center gap-[4.95px]', className)}>
      <div className="flex size-[14.85px] shrink-0 items-center justify-center rounded-[4.125px] border-[0.825px] border-solid border-line bg-well">
        <p className="text-[8.662px] leading-[12.994px] font-medium tracking-[-0.066px] whitespace-nowrap text-muted">
          {number}
        </p>
      </div>
      <p className="text-[9.9px] leading-[14.85px] font-medium tracking-[-0.066px] whitespace-nowrap text-ink-2">
        {label}
      </p>
    </div>
  );
}

// Figma "Approval gate" (2362:29466): "You approve" pill on a plan-map connector.
export function ApprovalGate({
  label = 'You approve',
  onClick,
  className,
}: {
  label?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex h-[24.75px] w-max items-center gap-[4.95px] rounded-[6.6px] border-[0.825px] border-solid border-line-2 bg-white px-[9.9px] drop-shadow-[0px_0.825px_0.825px_rgba(16,18,24,0.04)]',
        className
      )}
    >
      <span className="flex size-[14.85px] shrink-0 items-center justify-center rounded-[4.125px] bg-accent-soft">
        <img src={diamondBlue} alt="" className="size-[5.03px]" />
      </span>
      <span className="text-[9.9px] leading-[14.85px] font-medium tracking-[-0.066px] whitespace-nowrap text-ink">
        {label}
      </span>
    </button>
  );
}

// Figma "Add step button" (2362:29470): blue + on the plan map to add a step.
export function AddStepButton({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Add a step"
      onClick={onClick}
      className={clsx(
        'flex size-[16.5px] items-center justify-center rounded-[4.125px] bg-accent drop-shadow-[0px_3.3px_2.475px_rgba(0,0,0,0.1)] drop-shadow-[0px_1.65px_1.65px_rgba(0,0,0,0.1)] hover:bg-accent-hover',
        className
      )}
    >
      <img src={plusWhite} alt="" className="size-3.5" />
    </button>
  );
}

const STEP_OPTIONS = {
  helper: {
    title: 'Fact-checker',
    hint: 'Checks claims before anything is written',
  },
  approval: { title: 'You approve', hint: 'Pause here until you say yes' },
  condition: {
    title: 'Only if…',
    hint: 'Continue only when a condition is true',
  },
} as const;

// Figma "Step option" (2362:29483): item in the add-step menu: Helper, Approval, or Condition.
export function StepOption({
  type,
  title = STEP_OPTIONS[type].title,
  hint = STEP_OPTIONS[type].hint,
  onClick,
  className,
}: {
  type: 'helper' | 'approval' | 'condition';
  title?: string;
  hint?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-[207.9px] items-start gap-[8.25px] rounded-[8.25px] p-[6.6px] text-left hover:bg-hover',
        className
      )}
    >
      {type === 'helper' && (
        <span className="flex h-[13.2px] w-[11.55px] shrink-0 flex-col pt-[1.65px]">
          <img src={helperGlyph} alt="" className="size-[11.55px]" />
        </span>
      )}
      {type === 'approval' && (
        <span className="flex shrink-0 pt-[3.3px]">
          <img src={diamondDark} alt="" className="size-[5.03px]" />
        </span>
      )}
      {type === 'condition' && (
        <span className="flex shrink-0 pt-[3.3px]">
          <span className="relative size-[9.9px]">
            <span className="absolute top-[-2.05px] left-[-2.05px] flex size-[14px] items-center justify-center">
              <span className="size-[9.9px] rotate-45 border-[0.825px] border-solid border-ink" />
            </span>
          </span>
        </span>
      )}
      <span className="flex min-w-px flex-1 flex-col">
        <span className="text-[9.9px] leading-[14.85px] font-medium tracking-[-0.066px] whitespace-nowrap text-ink">
          {title}
        </span>
        <span className="text-[9.075px] leading-[13.613px] tracking-[-0.066px] whitespace-nowrap text-muted">
          {hint}
        </span>
      </span>
    </button>
  );
}
