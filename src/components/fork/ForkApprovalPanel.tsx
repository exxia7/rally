import { FORK_COLOR } from '@/components/map/forks';
import { ApprovalItem, type ApprovalState } from '@/components/panels/Cards';
import { InspectorHeader } from '@/components/panels/Inspector';
import { SidePanel } from '@/components/panels/SidePanel';
import { Button } from '@/components/ui/Button';

import type { Branch } from './branches';
import { ChosenVersionBadge } from './ChosenVersionBadge';

export type ForkApprovalItem = {
  /** The output it posts ("x", "discord"…), as in 5.1. */
  id: string;
  title: string;
  when: string;
  body: string;
  channelNote?: string;
  /** Figma's 5.1 item height class. */
  minH?: string;
};

/** One line of the comparison: what a branch would post (its lead copy). */
export type VersionLine = { branch: Branch; text: string };

export type ForkApprovalPanelProps = {
  /** The branch this approval is scoped to. */
  branch: Branch;
  /** That branch's outputs (5.1's items, filtered to what the branch redoes, with its copy). */
  items: ForkApprovalItem[];
  states: Record<string, ApprovalState>;
  onStateChange: (id: string, state: ApprovalState) => void;
  /** "Original: … · Fork 1: …": each branch's lead copy, this one included. */
  compare: VersionLine[];
  /** This branch is the version that goes out. */
  chosen: boolean;
  onUseVersion: () => void;
  /** Once chosen: approve what's still waiting. */
  onApproveAll: () => void;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onDecideLater?: () => void;
};

const BRANCH_DOT = { 1: 'bg-fork-1', 2: 'bg-fork-2', 3: 'bg-fork-3' } as const;
const BRANCH_TEXT = {
  1: 'text-fork-1',
  2: 'text-fork-2',
  3: 'text-fork-3',
} as const;

// Not in Figma (design/non-figma-ui.md), built from 5.1's pieces: a branch's "Ready to post" opens the approval
// panel scoped to that branch (finding 1f). Inspector header naming the branch in its colour, a comparison of what
// each version would post, the branch's Approval items, and "Use this version" to pick the version that goes out
// (the others are kept, not posted). Once chosen, the footer approves what's left.
export function ForkApprovalPanel({
  branch,
  items,
  states,
  onStateChange,
  compare,
  chosen,
  onUseVersion,
  onApproveAll,
  onClose,
  onEdit,
  onDecideLater,
}: ForkApprovalPanelProps) {
  const waiting = items.filter(
    (i) => (states[i.id] ?? 'waiting') === 'waiting'
  ).length;
  return (
    <SidePanel
      onClose={onClose}
      header={
        <div className="flex min-h-[113px] w-full shrink-0 flex-col">
          <InspectorHeader
            eyebrow="Approval"
            kindIcon={null}
            branch={branch.fork ? branch.name : 'Original path'}
            branchColor={branch.fork ? BRANCH_DOT[branch.fork] : undefined}
            branchTextColor={branch.fork ? BRANCH_TEXT[branch.fork] : undefined}
            title="Ready to post"
            meta={
              chosen
                ? 'This version goes out. The others are kept, not posted.'
                : 'Pick the version that goes out. The others are kept, not posted.'
            }
            onClose={onClose}
          />
        </div>
      }
      bodyClassName="gap-4 px-6 py-5 max-md:px-4"
      footer={
        <div className="flex w-full shrink-0 items-start gap-2 border-t border-line bg-white px-6 py-4 max-md:px-4">
          {chosen ? (
            <Button
              variant="primary"
              disabled={!waiting}
              onClick={onApproveAll}
            >
              {waiting ? `Approve all ${waiting}` : 'All approved'}
            </Button>
          ) : (
            <Button variant="primary" onClick={onUseVersion}>
              Use this version
            </Button>
          )}
          <Button onClick={onDecideLater ?? onClose}>Decide later</Button>
        </div>
      }
    >
      {chosen && <ChosenVersionBadge />}
      {compare.length > 1 && (
        <div
          aria-label="Compare versions"
          className="flex w-full flex-col gap-1 rounded-[10px] bg-well px-3.5 py-3"
        >
          {compare.map((v) => (
            <p
              key={v.branch.id}
              className="truncate text-[12px] leading-[18px] tracking-[-0.08px] text-ink-2"
            >
              <span
                className="font-medium"
                style={
                  v.branch.fork
                    ? { color: FORK_COLOR[v.branch.fork] }
                    : undefined
                }
              >
                {v.branch.name}:
              </span>{' '}
              {v.text}
            </p>
          ))}
        </div>
      )}
      <div className="flex w-full flex-col items-start gap-2.5">
        {items.map((item) => (
          <ApprovalItem
            key={item.id}
            title={item.title}
            when={item.when}
            body={item.body}
            channelNote={item.channelNote}
            state={states[item.id] ?? 'waiting'}
            onChange={(s) => onStateChange(item.id, s)}
            onEdit={onEdit && (() => onEdit(item.id))}
            className={`w-full shrink-0 ${item.minH ?? ''}`}
          />
        ))}
      </div>
    </SidePanel>
  );
}
