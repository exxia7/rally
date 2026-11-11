import { useNavigate } from 'react-router-dom';

import logo31 from '@/assets/icons/logo-31.svg';
import { WorkflowTopBar } from '@/components/nav/WorkflowTopBar';
import { AppShell } from '@/components/shell/AppShell';
import { Icon } from '@/components/ui/Icon';
import { screenPath } from '@/screens/registry';

export const screenId = '3.1';

// Figma 3.1 "Flowchart · empty" (2362:24710): the Flowchart view of a new workflow before anything runs. The
// canvas (#fcfcfd) centres the "Switch to Planning" empty state: 56px workflow-logo tile (31px logo), SemiBold
// 20/28 title, 14/22 line 8px below.
export default function FlowchartEmptyScreen() {
  const navigate = useNavigate();
  return (
    <AppShell sidebar="none">
      <WorkflowTopBar
        title="New workflow"
        hideTitleMenu
        view="flowchart"
        onViewChange={(v) => v === 'planning' && navigate(screenPath('2.1'))}
      />
      <div className="flex min-h-px w-full flex-1 items-center justify-center bg-canvas px-4">
        <div className="flex w-[420px] max-w-full flex-col items-center text-center">
          <div className="flex w-full items-center justify-center pb-5">
            <div className="flex size-14 items-center justify-center rounded-[14px]">
              <Icon src={logo31} size={31.111} />
            </div>
          </div>
          <p className="w-full text-[20px] leading-7 font-semibold tracking-[-0.4px] text-ink">
            No workflows running
          </p>
          <p className="w-full pt-2 text-[14px] leading-[22px] tracking-[-0.08px] text-ink">
            Switch to the{' '}
            <button
              type="button"
              onClick={() => navigate(screenPath('2.1'))}
              className="hover:text-accent hover:underline"
            >
              Planning
            </button>{' '}
            tab to get started.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
