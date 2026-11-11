import clsx from 'clsx';
import { Link } from 'react-router-dom';

import bell from '@/assets/icons/bell.svg';
import logo from '@/assets/icons/logo.svg';
import settings from '@/assets/icons/settings.svg';
import workflows from '@/assets/icons/workflows.svg';
import { Icon } from '@/components/ui/Icon';
import { screenPath } from '@/screens/registry';

// Figma "Sidebar" (2362:29209): left app rail. Logo + Nav items + account.
export function Sidebar({
  active = 'workflows',
}: {
  active?: 'workflows' | 'settings' | 'none';
}) {
  return (
    <nav className="flex h-full w-[52px] shrink-0 flex-col items-center gap-1.5 rounded-card border border-line bg-white pt-2 pb-3">
      <div className="pb-2">
        <Link
          to={screenPath('1.1')}
          aria-label="Pathfinder home"
          className="flex size-9 items-center justify-center rounded-[9px] bg-accent-soft"
        >
          <Icon src={logo} size={20} />
        </Link>
      </div>
      <Link
        to={screenPath('1.1')}
        aria-label="Workflows"
        className={clsx(
          'flex size-9 items-center justify-center rounded-control',
          active === 'workflows' ? 'bg-accent-soft' : 'hover:bg-hover'
        )}
      >
        <Icon src={workflows} size={18} />
      </Link>
      <div className="flex min-h-px flex-1 flex-col items-start justify-end">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            aria-label="Needs you"
            className="flex size-9 items-center justify-center rounded-control hover:bg-hover"
          >
            <Icon src={bell} size={18} />
          </button>
          <Link
            to={screenPath('1.2')}
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
