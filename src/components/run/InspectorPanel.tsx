import forkIcon from '@/assets/icons/fork.svg';
import plusGray from '@/assets/icons/plus-gray.svg';
import rerunDim from '@/assets/icons/rerun-dim.svg';
import rerunIcon from '@/assets/icons/rerun.svg';
import type { ForkNumber } from '@/components/map/forks';
import { OutputPreview } from '@/components/panels/Cards';
import { ForkCard, type ForkCardContent } from '@/components/panels/ForkCard';
import {
  InspectorAction,
  InspectorField,
  InspectorHeader,
} from '@/components/panels/Inspector';
import { SidePanel } from '@/components/panels/SidePanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export type InspectorStepAction = {
  description: string;
  /** Step still running: #fafafb fill, muted text, no chevron. */
  disabled?: boolean;
  /** Override the 16px icon (defaults: Fork; Rerun, dimmed when disabled). */
  icon?: string;
};

export type InspectorData = {
  /** Node kind label ("Output", "Action"…). */
  eyebrow: string;
  /** 12px node-kind glyph; null for none. */
  kindIcon?: string | null;
  /** Branch label with its dot ("Original path", "Fork 1"). */
  branch?: string;
  /** Tailwind bg class for the branch dot. */
  branchColor?: string;
  /** The step is on a fork: its colour for the branch dot and label (4.5, 6.5, 6.6). */
  branchFork?: ForkNumber;
  title: string;
  meta: string;
  preview?: {
    eyebrow?: string;
    quote: string;
    working?: boolean;
    /** A fork's brief: dot and eyebrow in the fork's colour. */
    fork?: ForkNumber;
    action?: string | null;
  };
  /** A second Output preview 16px under the first: the brief of a fork made from this decision (4.5). */
  brief?: { eyebrow: string; quote: string; fork?: ForkNumber };
  /** The Fork card "Fork from here" opens in place of the actions (4.4, 6.4). Without it, Fork calls `onFork`. */
  forkForm?: ForkCardContent;
  /** false: no Edit / I'll do this one bar (a decision, 4.4 and 4.5). */
  footer?: boolean;
  fork?: InspectorStepAction | null;
  rerun?: InspectorStepAction | null;
  fields: { label: string; value: string }[];
  /** "Just for Writer": the step's own skills and files, as badges, with an Add button. */
  extras?: { label: string; items: string[] };
};

// The node inspector (3.5, 2362:25179): replaces the run side panel's tabs and closes with ×. Inspector header,
// then a 24px-sided, 20px-padded body: Output preview, the Fork / Rerun from here actions (16px above, 8px
// apart), Inspector fields, and the step's own resources (badges + ghost Add). A footer bar (1px line, 16/24
// padding) holds Edit and "I'll do this one". Docked/overlay/sheet behaviour comes from SidePanel.
// Forking (4.4, 6.4): with `forkForm`, Fork from here opens the Fork card (16px below the preview) in place of the
// actions; Cancel closes it, Create fork calls `onForkCreate`.
const BRANCH_DOT: Record<ForkNumber, string> = {
  1: 'bg-fork-1',
  2: 'bg-fork-2',
  3: 'bg-fork-3',
};
const BRANCH_TEXT: Record<ForkNumber, string> = {
  1: 'text-fork-1',
  2: 'text-fork-2',
  3: 'text-fork-3',
};

export function InspectorPanel({
  data,
  onClose,
  forkOpen,
  onForkOpenChange,
  onForkCreate,
  onFork,
  onRerun,
  onPreviewAction,
  onEdit,
  takenOver,
  onTakeOver,
}: {
  data: InspectorData;
  onClose: () => void;
  /** The Fork card is open (needs `data.forkForm`). */
  forkOpen?: boolean;
  onForkOpenChange?: (open: boolean) => void;
  onForkCreate?: (instruction: string) => void;
  onFork?: () => void;
  onRerun?: () => void;
  onPreviewAction?: () => void;
  onEdit?: () => void;
  /** You took the step over from the helper ("I'll do this one" pressed). */
  takenOver?: boolean;
  onTakeOver?: () => void;
}) {
  return (
    <SidePanel
      onClose={onClose}
      bodyClassName="px-6 py-5 max-md:px-4"
      header={
        <InspectorHeader
          eyebrow={data.eyebrow}
          kindIcon={data.kindIcon}
          branch={data.branch}
          branchColor={
            data.branchFork ? BRANCH_DOT[data.branchFork] : data.branchColor
          }
          branchTextColor={
            data.branchFork ? BRANCH_TEXT[data.branchFork] : undefined
          }
          title={data.title}
          meta={takenOver ? `${data.meta} · You’re doing this one` : data.meta}
          onClose={onClose}
        />
      }
      footer={
        data.footer !== false && (
          <div className="flex w-full shrink-0 items-start gap-2 border-t border-line bg-white px-6 py-4 max-md:px-4">
            {/* Figma's Edit is 51px; Chrome sets "Edit" 1.4px narrower, which would shift the next button. */}
            <Button
              variant="secondary"
              onClick={onEdit}
              className="min-w-[51px] justify-start"
            >
              Edit
            </Button>
            <Button variant="secondary" onClick={onTakeOver}>
              {takenOver ? 'Hand it back' : "I'll do this one"}
            </Button>
          </div>
        )
      }
    >
      <div className="flex w-full shrink-0 flex-col items-start">
        {data.preview && (
          <OutputPreview
            eyebrow={data.preview.eyebrow}
            quote={data.preview.quote}
            working={data.preview.working}
            fork={data.preview.fork}
            action={data.preview.action}
            onAction={onPreviewAction}
          />
        )}
        {data.brief && (
          <div className="flex w-full flex-col items-start pt-4">
            <OutputPreview
              eyebrow={data.brief.eyebrow}
              quote={data.brief.quote}
              fork={data.brief.fork}
              action={null}
            />
          </div>
        )}
        {forkOpen && data.forkForm ? (
          <div className="flex w-full flex-col items-start pt-4">
            <ForkCard
              {...data.forkForm}
              onCreate={onForkCreate}
              onCancel={() => onForkOpenChange?.(false)}
            />
          </div>
        ) : (
          (data.fork || data.rerun) && (
            <div className="flex w-full flex-col items-center gap-2 pt-4">
              {data.fork && (
                <InspectorAction
                  icon={data.fork.icon ?? forkIcon}
                  title="Fork from here"
                  description={data.fork.description}
                  disabled={data.fork.disabled}
                  onClick={
                    data.forkForm ? () => onForkOpenChange?.(true) : onFork
                  }
                />
              )}
              {data.rerun && (
                <InspectorAction
                  icon={
                    data.rerun.icon ??
                    (data.rerun.disabled ? rerunDim : rerunIcon)
                  }
                  title="Rerun from here"
                  description={data.rerun.description}
                  disabled={data.rerun.disabled}
                  onClick={onRerun}
                />
              )}
            </div>
          )
        )}
        {data.fields.map((f) => (
          <InspectorField key={f.label} label={f.label}>
            {f.value}
          </InspectorField>
        ))}
        {data.extras && (
          <div className="flex w-full flex-col items-start py-5">
            <p className="text-[12px] leading-[18px] tracking-[-0.08px] whitespace-nowrap text-muted">
              {data.extras.label}
            </p>
            {/* Figma keeps this row 24px; the 28px Add button hangs 4px below it. */}
            <div className="flex h-6 w-full flex-wrap items-start gap-1.5 pt-1 max-md:h-auto">
              {data.extras.items.map((item) => (
                <Badge key={item} tone="subtle">
                  {item}
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                leading={<Icon src={plusGray} size={16} />}
                onClick={onEdit}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </div>
    </SidePanel>
  );
}
