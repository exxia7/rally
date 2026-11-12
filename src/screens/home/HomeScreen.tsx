import { useMemo, useState } from 'react';

import plusIcon from '@/assets/icons/plus.svg';
import searchIcon from '@/assets/icons/search.svg';
import {
  WorkflowCard,
  type WorkflowCardData,
} from '@/components/home/WorkflowCard';
import { AppShell, TopBar } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Icon } from '@/components/ui/Icon';
import {
  StatusFilter,
  type StatusFilterValue,
} from '@/components/ui/StatusFilter';
import { useNewWorkflow } from '@/state/actions';
import { cardTarget, useGo } from '@/state/nav';
import { planMiniMap } from '@/state/planView';
import { workflowCard } from '@/state/runView';
import { dispatch, useAppState } from '@/state/store';
import type { Workflow } from '@/state/types';

function homeCard(wf: Workflow): WorkflowCardData {
  const card = workflowCard(wf);
  return {
    title: wf.title,
    status: card.status,
    meta: card.meta,
    preview: wf.preview,
    needsYou: card.needsYou,
    // Figma's mock workflows keep their art, and the AI Coach art is its hand raised (1.1); every other workflow
    // whose plan is in the store (a duplicate, a draft, a new workflow, a run going on its own) shows its own plan.
    plan:
      !wf.card &&
      wf.helperOrder.length > 0 &&
      !(wf.preview === 'ai-coach' && card.needsYou)
        ? planMiniMap(wf)
        : undefined,
    to: cardTarget(wf),
  };
}

type Filter = 'all' | 'running' | 'needs-you';

export const screenId = '1.1';

// Figma 1.1 "Home · your workflows" (2362:23299)
export default function HomeScreen() {
  const go = useGo();
  const newWorkflow = useNewWorkflow();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilterValue>('all');

  const app = useAppState();
  // Cards are the store's workflows: the live one says running / needs you / done as it goes.
  const WORKFLOWS = useMemo(
    () =>
      app.order
        .map((id) => app.workflows[id])
        // Archived workflows (2.8 Archive) leave the list until restored.
        .filter((wf) => wf && !wf.archived)
        .map((wf) => ({ wf, ...homeCard(wf) })),
    [app]
  );
  const open = (wf: Workflow) => {
    dispatch({ type: 'wf/open', id: wf.id });
    go(cardTarget(wf));
  };
  const visible = WORKFLOWS.filter(
    (w) =>
      (filter === 'all' ||
        (filter === 'running' && w.status === 'Running') ||
        (filter === 'needs-you' && w.needsYou)) &&
      (status === 'all' ||
        (status === 'drafts' && w.status === 'Draft') ||
        (status === 'done' && w.status === 'Done')) &&
      w.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AppShell>
      <TopBar
        left={
          <p className="text-[14px] leading-5 font-medium tracking-[-0.08px] whitespace-nowrap text-ink">
            Home
          </p>
        }
      />
      <div className="flex min-h-px w-full flex-1 flex-col items-center overflow-auto bg-white">
        <div className="flex w-full max-w-[1040px] flex-col items-start px-8 py-12 max-md:px-4 max-md:pt-6 max-md:pb-[calc(88px+env(safe-area-inset-bottom))]">
          <h1 className="max-w-[560px] text-[30px] leading-9 font-semibold tracking-[-0.75px] whitespace-nowrap text-ink max-md:text-[24px] max-md:leading-8">
            Your workflows
          </h1>
          <div className="flex w-full flex-wrap items-center gap-2 pt-5 max-md:pt-4">
            <label className="flex h-8 w-[200px] shrink-0 items-center gap-2 overflow-clip rounded-control edge [--edge:var(--color-line-2)] focus-within:[--edge:var(--color-accent-line)] px-3 max-md:order-first max-md:w-full">
              <Icon src={searchIcon} size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workflows"
                aria-label="Search workflows"
                className="min-w-px flex-1 bg-transparent text-[13px] leading-[normal] tracking-[-0.08px] text-ink outline-none placeholder:text-[rgba(29,30,34,0.5)]"
              />
            </label>
            <ChoiceChip
              selected={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              {`All · ${WORKFLOWS.length}`}
            </ChoiceChip>
            <ChoiceChip
              selected={filter === 'running'}
              onClick={() => setFilter('running')}
            >
              {`Running · ${WORKFLOWS.filter((w) => w.status === 'Running').length}`}
            </ChoiceChip>
            <ChoiceChip
              selected={filter === 'needs-you'}
              onClick={() => setFilter('needs-you')}
            >
              {`Needs you · ${WORKFLOWS.filter((w) => w.needsYou).length}`}
            </ChoiceChip>
            <StatusFilter value={status} onChange={setStatus} />
            <div className="flex min-w-fit flex-1 justify-end max-md:fixed max-md:right-4 max-md:bottom-[calc(16px+env(safe-area-inset-bottom))] max-md:z-10 max-md:flex-none">
              <Button
                variant="primary"
                className="max-md:h-10 max-md:shadow-[0_4px_12px_rgba(16,18,24,0.18)]"
                leading={<Icon src={plusIcon} size={16} />}
                onClick={newWorkflow}
              >
                New workflow
              </Button>
            </div>
          </div>
          <div className="flex w-full flex-wrap content-start items-start gap-5 pt-3 max-xl:grid max-xl:grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] max-md:gap-3 *:max-xl:w-auto">
            {visible.map((w) => (
              <WorkflowCard key={w.wf.id} {...w} onClick={() => open(w.wf)} />
            ))}
          </div>
          {visible.length === 0 && (
            // Not in Figma: nothing to show (a search or filter with no match, or every workflow archived).
            <div className="flex w-full flex-col items-center gap-1 rounded-card border border-dashed border-line-2 px-6 py-12 text-center">
              <p className="text-[14px] leading-5 font-medium tracking-[-0.08px] text-ink">
                {WORKFLOWS.length ? 'No workflows match' : 'No workflows yet'}
              </p>
              <p className="text-[13px] leading-5 tracking-[-0.08px] text-muted">
                {WORKFLOWS.length
                  ? 'Try another search or filter.'
                  : 'Start one with New workflow.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
