import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import chevronDown from '@/assets/icons/chevron-down.svg';
import plusIcon from '@/assets/icons/plus.svg';
import searchIcon from '@/assets/icons/search.svg';
import {
  WorkflowCard,
  type WorkflowCardData,
} from '@/components/home/WorkflowCard';
import { AppShell, TopBar } from '@/components/shell/AppShell';
import { UserAvatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/ChoiceChip';
import { Icon } from '@/components/ui/Icon';
import { screenPath } from '@/screens/registry';

const WORKFLOWS: WorkflowCardData[] = [
  {
    title: 'AI Coach launch',
    status: 'Running',
    meta: 'Needs your input',
    preview: 'ai-coach',
    needsYou: true,
    to: '3.2',
  },
  {
    title: 'Pricing change announcement',
    status: 'Draft',
    meta: 'Edited 2 hours ago',
    preview: 'pricing',
    to: '2.1',
  },
  {
    title: 'Product Hunt relaunch',
    status: 'Done',
    meta: 'Launched Feb 2',
    preview: 'product-launch',
    to: '5.2',
  },
  {
    title: 'Hiring: founding designer',
    status: 'Done',
    meta: 'Posted Jan 18',
    preview: 'hiring',
    to: '5.2',
  },
];

type Filter = 'all' | 'running' | 'needs-you';

export const screenId = "1.1"

// Figma 1.1 "Home · your workflows" (2362:23299)
export default function HomeScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const visible = WORKFLOWS.filter(
    (w) =>
      (filter === 'all' ||
        (filter === 'running' && w.status === 'Running') ||
        (filter === 'needs-you' && w.needsYou)) &&
      w.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AppShell>
      <TopBar
        left={
          <p className="text-[14px] leading-5 font-medium tracking-[-0.08px] whitespace-nowrap text-ink">
            Lumen workspace
          </p>
        }
        right={
          <>
            <Button
              variant="secondary"
              className="w-[148.031px]"
              onClick={() => navigate(screenPath('1.2'))}
            >
              Workspace settings
            </Button>
            <UserAvatar />
          </>
        }
      />
      <div className="flex min-h-px w-full flex-1 flex-col items-center overflow-auto bg-white">
        <div className="flex w-[1040px] max-w-[1040px] flex-col items-start px-8 py-12">
          <h1 className="w-[560px] text-[30px] leading-9 font-semibold tracking-[-0.75px] whitespace-nowrap text-ink">
            Your workflows
          </h1>
          <div className="flex w-[976px] items-center gap-2 pt-5">
            <label className="flex h-8 w-[200px] shrink-0 items-center gap-2 overflow-clip rounded-control edge [--edge:var(--color-line-2)] px-3">
              <Icon src={searchIcon} size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workflows"
                className="min-w-px flex-1 bg-transparent text-[13px] leading-[normal] tracking-[-0.08px] text-ink outline-none placeholder:text-[rgba(29,30,34,0.5)]"
              />
            </label>
            <ChoiceChip
              selected={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All · 4
            </ChoiceChip>
            <ChoiceChip
              selected={filter === 'running'}
              onClick={() => setFilter('running')}
            >
              Running · 1
            </ChoiceChip>
            <ChoiceChip
              selected={filter === 'needs-you'}
              onClick={() => setFilter('needs-you')}
            >
              Needs you · 1
            </ChoiceChip>
            <Button
              variant="secondary"
              size="sm"
              trailing={<Icon src={chevronDown} size={16} />}
            >
              Status
            </Button>
            <div className="flex min-w-px flex-1 justify-end">
              <Button
                variant="primary"
                leading={<Icon src={plusIcon} size={16} />}
                onClick={() => navigate(screenPath('2.1'))}
              >
                New workflow
              </Button>
            </div>
          </div>
          <div className="flex w-full flex-wrap content-start items-start gap-5 pt-3">
            {visible.map((w) => (
              <WorkflowCard
                key={w.title}
                {...w}
                onClick={() => navigate(screenPath(w.to))}
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
