import clsx from 'clsx';
import { Link } from 'react-router-dom';

import bell from '@/assets/icons/bell.svg';
import logo from '@/assets/icons/logo.svg';
import settings from '@/assets/icons/settings.svg';
import workflows from '@/assets/icons/workflows.svg';
import workflowsInactive from '@/assets/icons/workflows-ink2.svg';
import { Icon } from '@/components/ui/Icon';
import { screenPath } from '@/screens/registry';
import { CARRY, cardTarget } from '@/state/nav';
import { workflowCard } from '@/state/runView';
import { dispatch, useAppState } from '@/state/store';

// Figma "Sidebar" (2362:29209): left app rail. Logo + Nav items + account.
// Under 768px it becomes a bottom tab bar (no logo; workflows, needs you, settings, account in a row).
export function Sidebar({
  active = 'workflows',
}: {
  active?: 'workflows' | 'settings' | 'none';
}) {
  const app = useAppState();
  const waiting = app.order
    .map((id) => app.workflows[id])
    .find((wf) => wf && workflowCard(wf).needsYou);
  return (
    <nav className="flex h-full w-[52px] shrink-0 flex-col items-center gap-1.5 rounded-card border border-line bg-white pt-2 pb-3 max-md:h-14 max-md:w-full max-md:flex-row max-md:justify-around max-md:gap-0 max-md:rounded-none max-md:border-x-0 max-md:border-b-0 max-md:px-4 max-md:py-0 max-md:pb-[env(safe-area-inset-bottom)]">
      <div className="pb-2 max-md:hidden">
        <Link
          to={screenPath('1.1')}
          state={CARRY}
          aria-label="Pathfinder home"
          className="flex size-9 items-center justify-center rounded-[9px] bg-accent-soft"
        >
          <Icon src={logo} size={20} />
        </Link>
      </div>
      <Link
        to={screenPath('1.1')}
          state={CARRY}
        aria-label="Workflows"
        className={clsx(
          'flex size-9 items-center justify-center rounded-control',
          active === 'workflows' ? 'bg-accent-soft' : 'hover:bg-hover'
        )}
      >
        <Icon
          src={active === 'workflows' ? workflows : workflowsInactive}
          size={18}
        />
      </Link>
      <div className="flex min-h-px flex-1 flex-col items-start justify-end max-md:contents">
        <div className="flex flex-col items-center gap-2 max-md:contents">
          {/* The workflow waiting on you (a raised hand, approvals); with nothing waiting it goes Home. */}
          <Link
            to={screenPath(waiting ? cardTarget(waiting) : '1.1')}
            state={CARRY}
            onClick={() =>
              waiting && dispatch({ type: 'wf/open', id: waiting.id })
            }
            aria-label={waiting ? `Needs you: ${waiting.title}` : 'Nothing needs you'}
            className="flex size-9 items-center justify-center rounded-control hover:bg-hover"
          >
            <Icon src={bell} size={18} />
          </Link>
          <Link
            to={screenPath('1.2')}
            state={CARRY}
            aria-label="Workspace settings"
            className={clsx(
              'flex size-9 items-center justify-center rounded-control',
              active === 'settings' ? 'bg-accent-soft' : 'hover:bg-hover'
            )}
          >
            <Icon src={settings} size={18} />
          </Link>
          <div className="relative flex size-8 items-center justify-center rounded-full bg-[#d9ecf7] text-[11px] leading-[16.5px] font-semibold tracking-[-0.08px] text-[#2a6d93]">
            E
            <span className="absolute top-6 left-6 size-2.5 rounded-full border-2 border-white bg-ok" />
          </div>
        </div>
      </div>
    </nav>
  );
}
