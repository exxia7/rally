import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import chevronDown14 from '@/assets/icons/chevron-down-14.svg';
import more from '@/assets/icons/more.svg';
import panel from '@/assets/icons/panel.svg';
import settings16 from '@/assets/icons/settings-16.svg';
import { TopBar } from '@/components/shell/AppShell';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Menu, type MenuItemData } from '@/components/ui/Menu';
import { RunStatus, type RunState } from '@/components/ui/RunStatus';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { screenPath } from '@/screens/registry';

import { Breadcrumb } from './Breadcrumb';

// The workflow top bar (Figma "TopBar" in frames 2.x–6.x, e.g. 2362:24740): breadcrumb "Workflows / <title> ⌄",
// then 16px later the Planning / Flowchart segmented control; on the right, 8px apart: run status pill,
// workflow settings and panel toggle (Outlined icon buttons), then the main action (Pause, Start launch…).
// Under 1280px the status pill shows only its dot. Under 768px the breadcrumb collapses to the truncated title, and the settings
// and panel toggle move into a "more" menu.
export type WorkflowView = 'planning' | 'flowchart';

export function WorkflowTopBar({
  title = 'AI Coach launch',
  view,
  onViewChange,
  status,
  statusLabel,
  onSettings,
  panelOpen,
  onTogglePanel,
  action,
}: {
  title?: string;
  view: WorkflowView;
  onViewChange?: (view: WorkflowView) => void;
  status?: RunState;
  statusLabel?: string;
  /** Shows the workflow settings button. */
  onSettings?: () => void;
  panelOpen?: boolean;
  /** Shows the side panel toggle. */
  onTogglePanel?: () => void;
  /** The main action, e.g. a Pause or Start launch Button. */
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  const [titleMenu, setTitleMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const closeTitle = useCallback(() => setTitleMenu(false), []);
  const closeMore = useCallback(() => setMoreMenu(false), []);
  useOutsideClick([titleRef], titleMenu, closeTitle);
  useOutsideClick([moreRef], moreMenu, closeMore);

  const titleItems: MenuItemData[] = [
    {
      key: 'all',
      label: 'All workflows',
      onSelect: () => navigate(screenPath('1.1')),
    },
    {
      key: 'settings',
      label: 'Workflow settings',
      onSelect: () => navigate(screenPath('2.8')),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      onSelect: () => navigate(screenPath('2.7')),
    },
  ];
  const moreItems: MenuItemData[] = [
    ...(onSettings
      ? [
          {
            key: 'settings',
            label: 'Workflow settings',
            icon: settings16,
            onSelect: onSettings,
          },
        ]
      : []),
    ...(onTogglePanel
      ? [
          {
            key: 'panel',
            label: panelOpen ? 'Hide side panel' : 'Show side panel',
            icon: panel,
            onSelect: onTogglePanel,
          },
        ]
      : []),
  ];
  const hasSecondary = moreItems.length > 0;

  return (
    <TopBar
      left={
        <>
          <div ref={titleRef} className="relative flex min-w-0 items-center">
            <Breadcrumb
              parents={[{ label: 'Workflows', to: screenPath('1.1') }]}
              current={title}
              after={
                <button
                  type="button"
                  aria-label="Workflow menu"
                  aria-haspopup="menu"
                  aria-expanded={titleMenu}
                  onClick={() => setTitleMenu((o) => !o)}
                  className="flex shrink-0 rounded-[4px] hover:bg-hover"
                >
                  <Icon src={chevronDown14} size={14} />
                </button>
              }
            />
            {titleMenu && (
              <Menu
                label="Workflow"
                items={titleItems}
                onClose={closeTitle}
                className="absolute top-8 left-0 w-[220px]"
              />
            )}
          </div>
          <div className="flex shrink-0 items-center pl-4 max-md:pl-2">
            <SegmentedControl
              label="View"
              options={[
                { value: 'planning', label: 'Planning' },
                { value: 'flowchart', label: 'Flowchart' },
              ]}
              value={view}
              onChange={onViewChange}
            />
          </div>
        </>
      }
      right={
        <>
          {status && (
            <RunStatus
              state={status}
              label={statusLabel}
            />
          )}
          {onSettings && (
            <IconButton
              variant="outlined"
              icon={settings16}
              label="Workflow settings"
              onClick={onSettings}
              className="max-md:hidden"
            />
          )}
          {onTogglePanel && (
            <IconButton
              variant="outlined"
              icon={panel}
              label={panelOpen ? 'Hide side panel' : 'Show side panel'}
              aria-pressed={panelOpen}
              onClick={onTogglePanel}
              className="max-md:hidden"
            />
          )}
          {hasSecondary && (
            <div ref={moreRef} className="relative hidden max-md:flex">
              <IconButton
                variant="outlined"
                icon={more}
                label="More"
                aria-haspopup="menu"
                aria-expanded={moreMenu}
                onClick={() => setMoreMenu((o) => !o)}
              />
              {moreMenu && (
                <Menu
                  label="More"
                  items={moreItems}
                  onClose={closeMore}
                  className="absolute top-10 right-0 w-[220px]"
                />
              )}
            </div>
          )}
          {action}
        </>
      }
    />
  );
}
