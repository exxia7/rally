import clsx from 'clsx';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import bell from '@/assets/icons/bell.svg';
import chevronDown from '@/assets/icons/chevron-down-14.svg';
import close16 from '@/assets/icons/close-16.svg';
import home from '@/assets/icons/home.svg';
import logo from '@/assets/icons/logo.svg';
import plus from '@/assets/icons/plus-gray-14.svg';
import search from '@/assets/icons/search.svg';
import settings16 from '@/assets/icons/settings-16.svg';
import sidebarIcon from '@/assets/icons/sidebar.svg';
import workflowsIcon from '@/assets/icons/workflows-ink2.svg';
import { UserAvatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Menu, type MenuItemData } from '@/components/ui/Menu';
import { ShortcutKey } from '@/components/ui/ShortcutKey';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { useScrollEdges } from '@/lib/useScrollEdges';
import { YOU } from '@/screens/home/workspaceData';
import { useNewWorkflow, useOpenWorkflow } from '@/state/actions';
import { cardTarget, idFromPath, useGo, workflowFrame } from '@/state/nav';
import { workflowCard } from '@/state/runView';
import { dispatch, resetDemo, useAppState } from '@/state/store';
import type { Workflow } from '@/state/types';

import { focusSearch, SEARCH_ID, sidebarUi, useSidebarUi } from './sidebarUi';

// The app sidebar, structured like Figma's file browser (not in the wireframes, which draw a 52px icon rail; see
// design/non-figma-ui.md). Top to bottom: the workspace switcher (its menu opens 1.2's sections), search (filters
// the workflow list; ⌘/Ctrl+K focuses it, Esc clears), Home and Needs you, the Workflows list (every workflow
// that isn't archived, in Home's order, with a status dot; a row reopens the workflow where you left it), New
// workflow, and the account row (Reset demo, All screens). Rows are 32px, 13px Inter, 8px radius, 8px insets.
//
// Sizes: ≥1280px it's docked at 240px and collapses to a 52px rail (remembered). 768–1279px it's the rail, and
// expanding opens the full sidebar over the content. Under 768px there's no rail: the top bar's menu button opens
// it as a slide-out drawer. Overlay and drawer close on Esc, the scrim and navigation.

type Dot = 'running' | 'needsYou' | 'draft' | 'done';

const DOT_LABEL: Record<Dot, string> = {
  running: 'Running',
  needsYou: 'Needs you',
  draft: 'Draft',
  done: 'Done',
};

const DOT_CLASS: Record<Dot, string> = {
  running: 'bg-ok',
  needsYou: 'bg-problem',
  draft: 'border-[1.5px] border-muted-2',
  done: 'bg-muted-2',
};

function dotOf(wf: Workflow): Dot {
  const card = workflowCard(wf);
  if (card.needsYou) return 'needsYou';
  if (card.status === 'Running') return 'running';
  return card.status === 'Done' ? 'done' : 'draft';
}

const MOD =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? '⌘'
    : 'Ctrl ';

const WIDE = '(min-width: 1280px)';

/** What every part of the sidebar reads: the listed workflows, the ones waiting on you, and where you are. */
function useSidebarData() {
  const app = useAppState();
  const page = idFromPath(useLocation().pathname);
  const workflows = useMemo(
    () =>
      app.order
        .map((id) => app.workflows[id])
        // Archived workflows (2.8 Archive) leave the list and the bell, as on Home.
        .filter((wf): wf is Workflow => !!wf && !wf.archived),
    [app.order, app.workflows]
  );
  const waiting = useMemo(
    () => workflows.filter((wf) => workflowCard(wf).needsYou),
    [workflows]
  );
  return {
    workspace: app.workspace.name,
    workflows,
    waiting,
    page,
    /** The workflow on screen (none on Home or workspace settings). */
    activeId: workflowFrame(page) ? app.activeId : null,
  };
}

/** Workspace settings and two of its sections (1.2), remembering where you came from for its Back. */
function useWorkspaceItems(): MenuItemData[] {
  const go = useGo();
  const to = (section?: 'tools' | 'presets') =>
    go('1.2', { returnHere: true, state: section ? { section } : undefined });
  return [
    {
      key: 'settings',
      label: 'Workspace settings',
      icon: settings16,
      onSelect: () => to(),
    },
    { key: 'tools', label: 'Connected tools', onSelect: () => to('tools') },
    {
      key: 'presets',
      label: 'Permission presets',
      onSelect: () => to('presets'),
    },
  ];
}

function useAccountItems(): MenuItemData[] {
  const go = useGo();
  const navigate = useNavigate();
  return [
    {
      key: 'reset',
      label: 'Reset demo',
      description: 'Forget your changes and start again from Home',
      onSelect: () => {
        resetDemo();
        go('1.1');
      },
    },
    {
      key: 'screens',
      label: 'All screens',
      description: 'Every frame from the Figma wireframes',
      onSelect: () => navigate('/screens'),
    },
  ];
}

/** Opens the workflow that needs you at its hand-raise or approval screen (as the old bell did). */
function useOpenWaiting() {
  const open = useOpenWorkflow();
  return (wf: Workflow) => open(wf, cardTarget(wf));
}

/** Records the screen the active workflow is on, so its row in the list reopens it there. */
function useRememberScreen() {
  const { pathname } = useLocation();
  const app = useAppState();
  const frame = workflowFrame(idFromPath(pathname));
  const known = app.lastScreen?.[app.activeId];
  useEffect(() => {
    if (frame && frame !== known)
      dispatch({ type: 'nav/last', id: app.activeId, screen: frame });
  }, [frame, known, app.activeId]);
}

export function Sidebar() {
  useRememberScreen();
  const wide = useMediaQuery(WIDE);
  const phone = useMediaQuery('(max-width: 767px)');
  const { collapsed, open } = useSidebarUi();
  const { pathname } = useLocation();

  // Moving to another screen closes the overlay or drawer.
  useEffect(() => sidebarUi.setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') sidebarUi.setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  // ⌘/Ctrl+K: show the sidebar's search and focus it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== 'k') return;
      e.preventDefault();
      if (window.matchMedia(WIDE).matches) sidebarUi.setCollapsed(false);
      else sidebarUi.setOpen(true);
      focusSearch();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const overlay = !wide && <SidebarOverlay open={open} phone={phone} />;
  if (phone) return overlay;
  const docked = wide && !collapsed;
  return (
    <>
      <aside
        aria-label="Sidebar"
        className={clsx(
          'relative z-30 flex h-full shrink-0 rounded-card border border-line bg-white',
          docked ? 'w-[240px]' : 'w-[52px]'
        )}
      >
        {docked ? (
          <SidebarPanel
            mode="docked"
            onClose={() => sidebarUi.setCollapsed(true)}
          />
        ) : (
          <SidebarRail
            onExpand={() =>
              wide ? sidebarUi.setCollapsed(false) : sidebarUi.setOpen(true)
            }
          />
        )}
      </aside>
      {overlay}
    </>
  );
}

/** The full sidebar over the content: from the rail under 1280px, or the phone drawer. Slides in from the left. */
function SidebarOverlay({ open, phone }: { open: boolean; phone: boolean }) {
  const close = () => sidebarUi.setOpen(false);
  return (
    <div
      className={clsx('fixed inset-0 z-50', !open && 'pointer-events-none')}
      inert={!open}
    >
      <div
        aria-hidden
        onClick={close}
        className={clsx(
          'absolute inset-0 bg-[rgba(16,18,24,0.24)] transition-opacity duration-200 ease-out motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sidebar"
        className={clsx(
          'absolute flex bg-white shadow-[0px_8px_32px_0px_rgba(16,18,24,0.16)] transition-[translate,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          phone
            ? 'inset-y-0 left-0 w-[280px] max-w-[calc(100vw-48px)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
            : 'inset-y-2 left-2 w-[240px] rounded-card border border-line',
          open
            ? 'visible translate-x-0'
            : 'invisible -translate-x-[calc(100%+16px)]'
        )}
      >
        <SidebarPanel mode={phone ? 'drawer' : 'overlay'} onClose={close} />
      </aside>
    </div>
  );
}

/** The 240px sidebar (docked, overlay or drawer). */
function SidebarPanel({
  mode,
  onClose,
}: {
  mode: 'docked' | 'overlay' | 'drawer';
  onClose: () => void;
}) {
  const d = useSidebarData();
  const go = useGo();
  const openWorkflow = useOpenWorkflow();
  const openWaiting = useOpenWaiting();
  const newWorkflow = useNewWorkflow();
  const workspaceItems = useWorkspaceItems();
  const accountItems = useAccountItems();
  const [query, setQuery] = useState('');
  const [wsMenu, setWsMenu] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const closeWs = useCallback(() => setWsMenu(false), []);
  const closeAccount = useCallback(() => setAccountMenu(false), []);
  useOutsideClick([wsRef], wsMenu, closeWs);
  useOutsideClick([accountRef], accountMenu, closeAccount);
  const listRef = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(listRef);

  const q = query.trim().toLowerCase();
  const shown = q
    ? d.workflows.filter((wf) => wf.title.toLowerCase().includes(q))
    : d.workflows;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 p-2">
        <div ref={wsRef} className="relative flex min-w-0 flex-1">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={wsMenu}
            onClick={() => setWsMenu((o) => !o)}
            className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-control px-1.5 hover:bg-hover"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-accent-soft">
              <Icon src={logo} size={16} />
            </span>
            <span
              title={d.workspace}
              className="min-w-0 truncate text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-ink"
            >
              {d.workspace}
            </span>
            <Icon src={chevronDown} size={14} />
          </button>
          {wsMenu && (
            <Menu
              label="Workspace"
              items={workspaceItems}
              onClose={closeWs}
              className="absolute top-9 left-0 w-[220px]"
            />
          )}
        </div>
        <IconButton
          icon={mode === 'drawer' ? close16 : sidebarIcon}
          label={mode === 'docked' ? 'Collapse sidebar' : 'Close sidebar'}
          onClick={onClose}
        />
      </div>

      <div className="shrink-0 px-2 pb-2">
        <label className="flex h-8 items-center gap-2 rounded-control edge px-2.5 [--edge:var(--color-line-2)] focus-within:[--edge:var(--color-accent-line)]">
          <Icon src={search} size={14} />
          <input
            id={SEARCH_ID}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return;
              // Esc clears the search first; on an empty search it leaves the field (and closes a drawer).
              if (query) {
                e.stopPropagation();
                setQuery('');
              } else e.currentTarget.blur();
            }}
            placeholder="Search workflows"
            aria-label="Search workflows"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-[18px] tracking-[-0.08px] text-ink outline-none placeholder:text-muted-2"
          />
          {!query && mode !== 'drawer' && (
            <ShortcutKey>{`${MOD}K`}</ShortcutKey>
          )}
        </label>
      </div>

      <nav aria-label="Main" className="flex shrink-0 flex-col gap-px px-2">
        <NavRow
          icon={home}
          label="Home"
          active={d.page === '1.1'}
          onClick={() => go('1.1')}
        />
        <NavRow
          icon={bell}
          label="Needs you"
          count={d.waiting.length}
          title={
            d.waiting.length
              ? `Open ${d.waiting[0].title}`
              : 'Nothing needs you right now'
          }
          disabled={!d.waiting.length}
          onClick={() => d.waiting[0] && openWaiting(d.waiting[0])}
        />
        {/* Several waiting: each is listed under Needs you. */}
        {d.waiting.length > 1 &&
          d.waiting.map((wf) => (
            <WorkflowRow
              key={wf.id}
              wf={wf}
              indent
              active={wf.id === d.activeId}
              onClick={() => openWaiting(wf)}
            />
          ))}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col pt-4">
        <p className="shrink-0 px-4 pb-1 text-[12px] leading-[18px] font-medium tracking-[-0.08px] text-muted">
          Workflows
        </p>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto overscroll-contain px-2 pb-2"
          >
            {shown.map((wf) => (
              <WorkflowRow
                key={wf.id}
                wf={wf}
                active={wf.id === d.activeId}
                onClick={() => openWorkflow(wf)}
              />
            ))}
            {q && !shown.length && (
              <p className="px-2 py-1.5 text-[12px] leading-[18px] tracking-[-0.08px] break-words text-muted">
                {`No workflows match “${query.trim()}”`}
              </p>
            )}
            {!q && (
              <button
                type="button"
                onClick={newWorkflow}
                className="flex h-8 w-full shrink-0 items-center gap-2 rounded-control px-2 text-left text-[13px] leading-[18px] tracking-[-0.08px] text-muted hover:bg-hover hover:text-ink"
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  <Icon src={plus} size={14} />
                </span>
                New workflow
              </button>
            )}
          </div>
          <ScrollFades top={edges.top} bottom={edges.bottom} />
        </div>
      </div>

      <div
        ref={accountRef}
        className="relative shrink-0 border-t border-line p-2"
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={accountMenu}
          aria-label={`Account: ${YOU.name}`}
          onClick={() => setAccountMenu((o) => !o)}
          className="flex h-10 w-full items-center gap-2.5 rounded-control px-1.5 text-left hover:bg-hover"
        >
          <UserAvatar initial={YOU.initial} tone="dark" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] leading-[18px] font-medium tracking-[-0.08px] text-ink">
              {YOU.name}
            </span>
            <span className="truncate text-[12px] leading-4 tracking-[-0.08px] text-muted">
              {YOU.role}
            </span>
          </span>
          <Icon src={chevronDown} size={14} className="rotate-180" />
        </button>
        {accountMenu && (
          <Menu
            label="Account"
            items={accountItems}
            onClose={closeAccount}
            className="absolute bottom-full left-2 mb-1 w-[224px]"
          />
        )}
      </div>
    </div>
  );
}

function ScrollFades({ top, bottom }: { top: boolean; bottom: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className={clsx(
          'pointer-events-none absolute inset-x-0 top-0 h-4 bg-linear-to-b from-white to-transparent transition-opacity duration-150',
          top ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden
        className={clsx(
          'pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-white to-transparent transition-opacity duration-150',
          bottom ? 'opacity-100' : 'opacity-0'
        )}
      />
    </>
  );
}

function NavRow({
  icon,
  label,
  active,
  count,
  title,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  count?: number;
  title?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex h-8 w-full shrink-0 items-center gap-2 rounded-control px-2 text-left text-[13px] leading-[18px] tracking-[-0.08px]',
        active ? 'bg-chip font-medium text-ink' : 'text-ink-2',
        disabled ? 'cursor-default text-muted' : !active && 'hover:bg-hover'
      )}
    >
      <Icon
        src={icon}
        size={16}
        className={disabled ? 'opacity-60' : undefined}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {!!count && <CountBadge n={count} />}
    </button>
  );
}

function CountBadge({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={clsx(
        'flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-problem px-1.5 text-[11px] leading-4 font-semibold text-white tabular-nums',
        className
      )}
    >
      {n}
    </span>
  );
}

function WorkflowRow({
  wf,
  active,
  indent,
  onClick,
}: {
  wf: Workflow;
  active: boolean;
  indent?: boolean;
  onClick: () => void;
}) {
  const dot = dotOf(wf);
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${wf.title} · ${DOT_LABEL[dot]}`}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex h-8 w-full shrink-0 items-center gap-2 rounded-control text-left',
        indent ? 'pr-2 pl-8' : 'px-2',
        active ? 'bg-chip' : 'hover:bg-hover'
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        <span
          aria-hidden
          className={clsx('size-2 rounded-full', DOT_CLASS[dot])}
        />
      </span>
      <span
        className={clsx(
          'min-w-0 flex-1 truncate text-[13px] leading-[18px] tracking-[-0.08px]',
          active ? 'font-medium text-ink' : 'text-ink-2'
        )}
      >
        {wf.title}
      </span>
      <span className="sr-only">{`, ${DOT_LABEL[dot]}`}</span>
    </button>
  );
}

// ---- The 52px rail -------------------------------------------------------------------------------------------

/** A rail button with a flyout to its right (workspace and account menus, the waiting and workflow lists). */
function RailPop({
  button,
  children,
}: {
  button: (open: boolean, toggle: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick([ref], open, close);
  return (
    <div ref={ref} className="relative flex">
      {button(open, () => setOpen((o) => !o))}
      {open && children(close)}
    </div>
  );
}

function RailButton({
  icon,
  iconSize = 16,
  label,
  active,
  disabled,
  expanded,
  badge,
  onClick,
}: {
  icon: string;
  iconSize?: number;
  label: string;
  active?: boolean;
  disabled?: boolean;
  /** Set when it opens a flyout (aria-expanded). */
  expanded?: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-expanded={expanded}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={clsx(
        'relative flex size-9 shrink-0 items-center justify-center rounded-control',
        active || expanded ? 'bg-chip' : !disabled && 'hover:bg-hover',
        disabled && 'cursor-default'
      )}
    >
      <Icon
        src={icon}
        size={iconSize}
        className={disabled ? 'opacity-60' : undefined}
      />
      {!!badge && (
        <CountBadge
          n={badge}
          className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] leading-4 ring-2 ring-white"
        />
      )}
    </button>
  );
}

const FLYOUT =
  'absolute top-0 left-full z-30 ml-3 flex max-h-[min(420px,calc(100dvh-24px))] w-[240px] max-w-[calc(100vw-80px)] flex-col overflow-y-auto overscroll-contain rounded-card border border-line-2 bg-white p-1.5 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)]';

function SidebarRail({ onExpand }: { onExpand: () => void }) {
  const d = useSidebarData();
  const go = useGo();
  const openWorkflow = useOpenWorkflow();
  const openWaiting = useOpenWaiting();
  const newWorkflow = useNewWorkflow();
  const workspaceItems = useWorkspaceItems();
  const accountItems = useAccountItems();
  const n = d.waiting.length;

  return (
    <div className="flex h-full w-full flex-col items-center gap-1 py-2">
      <RailPop
        button={(open, toggle) => (
          <button
            type="button"
            aria-label={`${d.workspace} menu`}
            title={d.workspace}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={toggle}
            className="mb-1 flex size-9 items-center justify-center rounded-[9px] bg-accent-soft"
          >
            <Icon src={logo} size={20} />
          </button>
        )}
      >
        {(close) => (
          <Menu
            label="Workspace"
            items={workspaceItems}
            onClose={close}
            className="absolute top-0 left-full ml-3 w-[220px]"
          />
        )}
      </RailPop>
      <RailButton
        icon={search}
        iconSize={14}
        label={`Search workflows (${MOD}K)`}
        onClick={() => {
          onExpand();
          focusSearch();
        }}
      />
      <RailButton
        icon={home}
        label="Home"
        active={d.page === '1.1'}
        onClick={() => go('1.1')}
      />
      {n > 1 ? (
        <RailPop
          button={(open, toggle) => (
            <RailButton
              icon={bell}
              iconSize={18}
              label={`Needs you: ${n}`}
              badge={n}
              expanded={open}
              onClick={toggle}
            />
          )}
        >
          {(close) => (
            <div role="dialog" aria-label="Needs you" className={FLYOUT}>
              <FlyoutTitle>Needs you</FlyoutTitle>
              {d.waiting.map((wf) => (
                <WorkflowRow
                  key={wf.id}
                  wf={wf}
                  active={wf.id === d.activeId}
                  onClick={() => {
                    close();
                    openWaiting(wf);
                  }}
                />
              ))}
            </div>
          )}
        </RailPop>
      ) : (
        <RailButton
          icon={bell}
          iconSize={18}
          label={n ? `Needs you: ${d.waiting[0].title}` : 'Nothing needs you'}
          badge={n}
          disabled={!n}
          onClick={() => d.waiting[0] && openWaiting(d.waiting[0])}
        />
      )}
      <RailPop
        button={(open, toggle) => (
          <RailButton
            icon={workflowsIcon}
            iconSize={18}
            label="Workflows"
            active={!!d.activeId}
            expanded={open}
            onClick={toggle}
          />
        )}
      >
        {(close) => (
          <div role="dialog" aria-label="Workflows" className={FLYOUT}>
            <FlyoutTitle>Workflows</FlyoutTitle>
            {d.workflows.map((wf) => (
              <WorkflowRow
                key={wf.id}
                wf={wf}
                active={wf.id === d.activeId}
                onClick={() => {
                  close();
                  openWorkflow(wf);
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => {
                close();
                newWorkflow();
              }}
              className="flex h-8 w-full shrink-0 items-center gap-2 rounded-control px-2 text-left text-[13px] leading-[18px] tracking-[-0.08px] text-muted hover:bg-hover hover:text-ink"
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                <Icon src={plus} size={14} />
              </span>
              New workflow
            </button>
          </div>
        )}
      </RailPop>
      <div className="min-h-2 flex-1" />
      <RailButton
        icon={sidebarIcon}
        label="Expand sidebar"
        onClick={onExpand}
      />
      <RailPop
        button={(open, toggle) => (
          <button
            type="button"
            aria-label={`Account: ${YOU.name}`}
            title={YOU.name}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={toggle}
            className="mt-1 flex size-9 items-center justify-center rounded-full hover:bg-hover"
          >
            <UserAvatar initial={YOU.initial} tone="dark" />
          </button>
        )}
      >
        {(close) => (
          <Menu
            label="Account"
            items={accountItems}
            onClose={close}
            className="absolute bottom-0 left-full ml-3 w-[224px]"
          />
        )}
      </RailPop>
    </div>
  );
}

function FlyoutTitle({ children }: { children: ReactNode }) {
  return (
    <p className="shrink-0 px-2 pt-1 pb-1.5 text-[12px] leading-[18px] font-medium tracking-[-0.08px] text-muted">
      {children}
    </p>
  );
}
