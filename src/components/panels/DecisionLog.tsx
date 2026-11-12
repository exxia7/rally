import { useState, type ReactNode } from 'react';

import fork from '@/assets/icons/fork.svg';
import { AgentArt } from '@/components/agents/AgentAvatar';
import type { AgentName } from '@/components/agents/characters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Icon } from '@/components/ui/Icon';

// The Decisions tab of the run side panel (frame 3.4, 2362:25048): 24px sides. 12/18 muted intro, All / Yours /
// Helpers filter chips, a SemiBold 12 day label, then entries separated by 1px lines, a "N more" summary and
// "Export decision log".

export type Decision = {
  id: string;
  /** 20px art: a user avatar for your own choices, or any custom mark. */
  art?: ReactNode;
  /** The helper who decided; draws its 20px Agent art when `art` is not given. */
  agent?: AgentName;
  who: string;
  time: string;
  by: 'you' | 'helper';
  title: string;
  basis: string;
  tag?: string;
  canFork?: boolean;
};

// One decision entry: art, SemiBold name · time (+ optional neutral tag on the right), Medium 13/19.5 decision
// (a 20px box, as Figma rounds it),
// 12/18 muted basis, then Change (and Fork from here) Secondary Small buttons.
export function DecisionEntry({
  d,
  onChange,
  onFork,
}: {
  d: Decision;
  onChange?: () => void;
  onFork?: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-start border-t border-line py-3.5">
      <div className="flex w-full items-start gap-2.5 overflow-clip">
        <div className="relative size-5 shrink-0">
          {d.art ?? (d.agent && <AgentArt agent={d.agent} size={20} />)}
        </div>
        <div className="flex min-w-px flex-1 flex-col items-start gap-2.5 overflow-clip">
          <div className="flex w-full flex-col items-start gap-0.5 overflow-clip tracking-[-0.08px]">
            <div className="flex min-h-5 w-full items-center gap-1 text-[12px] leading-[18px] whitespace-nowrap">
              <p className="min-w-0 truncate font-semibold text-ink">{d.who}</p>
              <p className="shrink-0 text-muted">· {d.time}</p>
              {d.tag && (
                <div className="flex shrink-0 grow items-start justify-end pl-1">
                  <Badge tone="subtle">{d.tag}</Badge>
                </div>
              )}
            </div>
            <p className="min-h-5 w-full text-[13px] leading-[19.5px] font-medium text-ink">
              {d.title}
            </p>
            <p className="w-full text-[12px] leading-[18px] text-muted">
              {d.basis}
            </p>
          </div>
          <div className="flex w-full items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onChange}>
              Change
            </Button>
            {d.canFork && (
              <Button
                variant="secondary"
                size="sm"
                leading={<Icon src={fork} size={16} />}
                onClick={onFork}
              >
                Fork from here
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type Filter = 'all' | 'you' | 'helper';

export function DecisionLog({
  decisions,
  more,
  onChange,
  onFork,
}: {
  decisions: Decision[];
  /** Summary line for older decisions, e.g. "3 more · Permissions set to Balanced, …". */
  more?: string;
  onChange?: (d: Decision) => void;
  onFork?: (d: Decision) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [exported, setExported] = useState(false);
  const yours = decisions.filter((d) => d.by === 'you').length;
  const visible = decisions.filter((d) => filter === 'all' || d.by === filter);
  return (
    <div className="flex w-full flex-col items-start px-6 pt-3 max-md:px-4">
      <p className="w-full text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
        Everything your helpers decided and everything you chose, newest first.
      </p>
      <div className="flex h-10 w-full items-start gap-1.5 pt-3">
        <ChoiceChip
          selected={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All · {decisions.length}
        </ChoiceChip>
        <ChoiceChip
          selected={filter === 'you'}
          onClick={() => setFilter('you')}
        >
          Yours · {yours}
        </ChoiceChip>
        <ChoiceChip
          selected={filter === 'helper'}
          onClick={() => setFilter('helper')}
        >
          Helpers · {decisions.length - yours}
        </ChoiceChip>
      </div>
      <p className="h-[38px] pt-5 text-[12px] leading-[18px] font-semibold tracking-[-0.08px] whitespace-nowrap text-ink">
        Today
      </p>
      <div className="flex w-full flex-col items-start pt-1">
        {visible.map((d) => (
          <DecisionEntry
            key={d.id}
            d={d}
            onChange={() => onChange?.(d)}
            onFork={() => onFork?.(d)}
          />
        ))}
        {visible.length === 0 && (
          <p className="w-full border-t border-line py-3.5 text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
            {filter === 'you'
              ? 'You haven’t changed anything in this run yet.'
              : 'Nothing decided yet.'}
          </p>
        )}
      </div>
      {more && (
        <div className="flex w-full flex-col items-start border-t border-line py-3">
          <p className="w-full text-[12px] leading-[18px] tracking-[-0.08px] text-muted">
            {more}
          </p>
        </div>
      )}
      <div className="flex w-full flex-col items-start pt-1 pb-6">
        <Button
          variant="secondary"
          size="sm"
          disabled={exported}
          onClick={() => setExported(true)}
        >
          {exported ? 'Exported' : 'Export decision log'}
        </Button>
      </div>
    </div>
  );
}
