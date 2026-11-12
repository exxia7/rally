import { useState } from 'react';

import arrowRightWhite from '@/assets/icons/arrow-right-white.svg';
import { FixStep } from '@/components/nav/FixStep';
import { HandoffProblemCard } from '@/components/panels/Cards';
import { InspectorHeader } from '@/components/panels/Inspector';
import { SidePanel } from '@/components/panels/SidePanel';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { RadioCard } from '@/components/ui/RadioCard';

import { HandoffModal } from './DetailModals';

export type HandRaiseProblem = {
  /** "Missing", "Mismatch". */
  kind: string;
  context: string;
  title: string;
  detail: string;
  action?: string;
  /** Px between the detail and the action (10 by default; 4.3 has 12). */
  actionTop?: number;
  /** Figma rounds the card to a whole-pixel height (184 in 4.1, 167 in 4.3). */
  height?: number;
  /** The context after the kind: red in 4.1/4.3 (default), the component's muted grey in 4.1b. */
  contextTone?: 'muted' | 'problem';
};

/** One thing to fix: its Fix step label, the problem card and the choices. */
export type HandRaiseStep = {
  label: string;
  problem: HandRaiseProblem;
  options: { title: string; description: string }[];
};

export type HandRaiseData = {
  /** "Strategist raised its hand". */
  eyebrow: string;
  title: string;
  meta: string;
  steps: HandRaiseStep[];
  /** The last step's button ("Confirm"); earlier steps say "Next: <next step label>". */
  confirmLabel: string;
  /** "See the full handoff": who passed to whom and what arrived fine (runView.handoffOf); the Fix steps'
   *  problems are the rest. */
  handoff?: { from: string; to: string; passed: { title: string; detail: string }[] };
};

// The hand-raise panel (4.1 2362:27655, 4.3 2362:25379): the side panel when a helper raised its hand. Inspector
// header without kind glyph or branch, then a 24px-sided, 20px-padded body: Fix steps (several things to fix,
// 20px apart, the problem card 16px below), the Handoff problem card, "What should we do?" (SemiBold 14/21, 24px
// above), Radio cards (12px above, 8px apart), the dashed "Something else?" field (12px above and below, 44px,
// 12px radius) and the primary action pinned to the bottom. Steps and choices are local state; the last step's
// button calls `onConfirm`.
export function HandRaisePanel({
  data,
  onClose,
  onConfirm,
}: {
  data: HandRaiseData;
  onClose: () => void;
  onConfirm: (choices: number[], other: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<number[]>(() =>
    data.steps.map(() => 0)
  );
  const [other, setOther] = useState('');
  const [handoffOpen, setHandoffOpen] = useState(false);
  const current = data.steps[step];
  const last = step === data.steps.length - 1;
  const { problem } = current;

  return (
    <SidePanel
      sheet="half"
      onClose={onClose}
      bodyClassName="overflow-x-clip px-6 py-5 max-md:px-4"
      header={
        <InspectorHeader
          eyebrow={data.eyebrow}
          kindIcon={null}
          title={data.title}
          meta={data.meta}
          onClose={onClose}
        />
      }
    >
      {data.steps.length > 1 && (
        <div role="tablist" className="flex w-full shrink-0 items-center gap-5">
          {data.steps.map((s, i) => (
            <FixStep
              key={s.label}
              n={i + 1}
              label={s.label}
              current={i === step}
              onClick={() => setStep(i)}
            />
          ))}
        </div>
      )}
      <div
        className={
          data.steps.length > 1 ? 'w-full shrink-0 pt-4' : 'w-full shrink-0'
        }
      >
        <HandoffProblemCard
          key={step}
          kind={problem.kind}
          context={problem.context}
          contextTone={problem.contextTone ?? 'problem'}
          title={problem.title}
          detail={problem.detail}
          action={problem.action}
          actionTop={problem.actionTop}
          onAction={() => setHandoffOpen(true)}
          className="w-full"
          // Figma's whole-pixel card height; a minimum, so narrow phones can wrap more.
          style={problem.height ? { minHeight: problem.height } : undefined}
        />
      </div>
      <p className="h-[45px] shrink-0 pt-6 text-[14px] leading-[21px] font-semibold tracking-[-0.08px] whitespace-nowrap text-ink">
        What should we do?
      </p>
      <div
        role="radiogroup"
        aria-label="What should we do?"
        className="flex w-full shrink-0 flex-col items-start gap-2 pt-3"
      >
        {current.options.map((o, i) => (
          <RadioCard
            key={o.title}
            title={o.title}
            description={o.description}
            selected={choices[step] === i}
            onSelect={() =>
              setChoices((c) => c.map((v, j) => (j === step ? i : v)))
            }
            className="w-full"
            titleClassName="min-h-[21px]"
          />
        ))}
      </div>
      <div className="relative w-full shrink-0 py-3">
        <input
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Something else? Tell the team what to do…"
          aria-label="Something else"
          className="peer h-11 w-full rounded-card px-[15px] text-[13px] leading-[normal] tracking-[-0.08px] text-ink outline-none placeholder:text-[rgba(29,30,34,0.5)]"
        />
        {/* Figma's 1px dashed stroke (2/1 dashes, which CSS `dashed` can't draw); solid blue while typing. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-3 h-11 w-full stroke-line-2 peer-focus:stroke-accent-line"
          fill="none"
        >
          <rect
            x="0.5"
            y="0.5"
            rx="11.5"
            strokeDasharray="2 1"
            strokeDashoffset={1}
            style={{ width: 'calc(100% - 1px)', height: 'calc(100% - 1px)' }}
          />
        </svg>
      </div>
      <div className="flex min-h-px w-full flex-1 flex-col items-start justify-end">
        {last ? (
          <Button variant="primary" onClick={() => onConfirm(choices, other)}>
            {data.confirmLabel}
          </Button>
        ) : (
          <Button
            variant="primary"
            trailing={<Icon src={arrowRightWhite} size={16} />}
            onClick={() => setStep(step + 1)}
          >
            Next: {data.steps[step + 1].label.toLowerCase()}
          </Button>
        )}
      </div>
      <HandoffModal
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        data={data}
      />
    </SidePanel>
  );
}
