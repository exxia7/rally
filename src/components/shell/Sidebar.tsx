import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';

import bell from '@/assets/icons/bell.svg';
import chevronDown from '@/assets/icons/chevron-down-14.svg';
import close16 from '@/assets/icons/close-16.svg';
import logo from '@/assets/icons/logo.svg';
import search from '@/assets/icons/search.svg';
import spark from '@/assets/icons/rally-spark.svg';
import settings16 from '@/assets/icons/settings-16.svg';
import sidebarIcon from '@/assets/icons/sidebar.svg';
import workflowsIcon from '@/assets/icons/workflows-ink2.svg';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useOutsideClick } from '@/lib/useOutsideClick';
import { useScrollEdges } from '@/lib/useScrollEdges';
import { YOU } from '@/screens/home/workspaceData';
import { useNewWorkflow, useOpenWorkflow } from '@/state/actions';
import { cardTarget, idFromPath, useGo, workflowFrame } from '@/state/nav';
import { workflowCard } from '@/state/runView';
import { dispatch, useAppState } from '@/state/store';
import type { Workflow } from '@/state/types';

import { focusSearch, SEARCH_ID, sidebarUi, useSidebarUi } from './sidebarUi';

// The hifi shell uses a 52px icon rail. Its brand button opens the workflow sidebar.
// Desktop can dock the expanded panel; tablet and phone use an overlay drawer.
// Keep navigation at the top and account/help/notifications at the bottom.

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

// CLAUDE.md "Motion": a calm ease-out for moves.
const EASE = [0.22, 1, 0.36, 1] as const;

/** The sidebar's transitions, or none under reduced motion. */
function useSidebarTransition() {
  const reduce = useReducedMotion();
  return {
    move: reduce ? { duration: 0 } : { duration: 0.28, ease: EASE },
    fade: reduce
      ? { duration: 0 }
      : { duration: 0.18, ease: 'easeOut' as const },
  };
}

/** What every part of the sidebar reads: the listed workflows, the ones waiting on you, and where you are. */
function useSidebarData() {
  const app = useAppState();
  const page = idFromPath(useLocation().pathname);
  const workflows = useMemo(
    () =>
      app.order
        .map((id) => app.workflows[id])
        // Archived workflows (2.8 Archive) leave the list and the bell, as on Home. A brand-new one joins once its
        // brief gives it a title: until then it would be a second "New workflow" row, and inserting it at the top
        // would shift the list under the pointer that just clicked New workflow.
        .filter((wf): wf is Workflow => !!wf && !wf.archived && !wf.isNew),
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

  const t = useSidebarTransition();
  const overlay = !wide && <SidebarOverlay open={open} phone={phone} />;
  if (phone) return overlay;
  const docked = wide && !collapsed;
  return (
    <>
      <motion.aside
        layout
        transition={t.move}
        aria-label="Sidebar"
        // The radius in style, so framer-motion keeps it round while it scales the width.
        style={{ borderRadius: 12 }}
        className={clsx(
          'relative z-30 flex h-full shrink-0 border border-line bg-white',
          docked ? 'w-[240px]' : 'w-[52px]'
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={docked ? 'panel' : 'rail'}
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={t.fade}
            className="flex h-full w-full min-w-0"
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
          </motion.div>
        </AnimatePresence>
      </motion.aside>
      {overlay}
    </>
  );
}

/** The full sidebar over the content: from the rail under 1280px, or the phone drawer. Slides in from the left
 *  over a scrim; mounted only while open. */
function SidebarOverlay({ open, phone }: { open: boolean; phone: boolean }) {
  const t = useSidebarTransition();
  const close = () => sidebarUi.setOpen(false);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          aria-hidden
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={t.fade}
          className="fixed inset-0 z-50 bg-[rgba(16,18,24,0.24)]"
        />
      )}
      {open && (
        <motion.aside
          key="sidebar"
          role="dialog"
          aria-modal="true"
          aria-label="Sidebar"
          initial={{ x: 'calc(-100% - 16px)' }}
          animate={{ x: 0 }}
          exit={{ x: 'calc(-100% - 16px)' }}
          transition={t.move}
          className={clsx(
            'fixed z-50 flex bg-white shadow-[0px_8px_32px_0px_rgba(16,18,24,0.16)]',
            phone
              ? 'inset-y-0 left-0 w-[280px] max-w-[calc(100vw-48px)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
              : 'inset-y-2 left-2 w-[240px] rounded-card border border-line'
          )}
        >
          <SidebarPanel mode={phone ? 'drawer' : 'overlay'} onClose={close} />
        </motion.aside>
      )}
    </AnimatePresence>
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
  const [query, setQuery] = useState('');
  const [accountMenu, setAccountMenu] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const closeAccount = useCallback(() => setAccountMenu(false), []);
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
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-accent-soft"><Icon src={logo} size={36} /></span>
          <span className="truncate text-[13px] font-semibold text-ink">{d.workspace}</span>
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
        </label>
      </div>

      <nav aria-label="Main" className="flex shrink-0 flex-col gap-px px-2">
        <NavRow
          icon={workflowsIcon}
          label="Workflows"
          active={d.page === '1.1'}
          onClick={() => go('1.1')}
        />
        <NavRow icon={spark} label="New workflow" onClick={newWorkflow} />
        <NavRow icon={settings16} label="Workspace settings" active={d.page === '1.2'} onClick={() => go('1.2', { returnHere: true, state: { section: 'general' } })} />
        <RailPop button={(open, toggle) => <NavRow icon={bell} label="Needs you" count={d.waiting.length} active={open} onClick={toggle} />}>
          {close => <div role="dialog" aria-label="Needs you" className="absolute left-0 top-full z-40 mt-1 w-[220px] rounded-card border border-line bg-white p-2 shadow-lg">
            <FlyoutTitle>Needs you</FlyoutTitle>
            {d.waiting.length ? d.waiting.map(wf => <WorkflowRow key={wf.id} wf={wf} active={false} onClick={() => { close(); openWaiting(wf); }} />) : <p className="p-2 text-[12px] text-muted">Nothing needs you right now.</p>}
          </div>}
        </RailPop>
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

          </div>
          <ScrollFades top={edges.top} bottom={edges.bottom} />
        </div>
      </div>

      <div className="px-2 pb-2">
        <RailPop button={(open, toggle) => <button type="button" aria-label="Help" aria-expanded={open} onClick={toggle} className="flex h-8 w-full items-center gap-2 rounded-control px-2 text-[13px] text-ink-2 hover:bg-hover"><span className="w-4 text-center font-semibold">?</span>Help</button>}>
          {() => <div role="dialog" aria-label="Help" className="absolute bottom-full left-0 z-40 mb-1 w-[220px] rounded-card border border-line bg-white p-3 text-[12px] leading-[18px] text-ink-2 shadow-lg"><HelpDetails /></div>}
        </RailPop>
      </div>
      <div
        ref={accountRef}
        className="relative shrink-0 border-t border-line p-2"
      >
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={accountMenu}
          aria-label={`Account: ${YOU.name}`}
          onClick={() => setAccountMenu((o) => !o)}
          className="flex h-10 w-full items-center gap-2.5 rounded-control px-1.5 text-left hover:bg-hover"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#d8edf8] text-[11px] font-semibold text-[#267599]">{YOU.initial}</span>
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
          <AccountDetails className="absolute bottom-full left-2 mb-1 w-[224px]" />
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
          'pointer-events-none absolute inset-x-0 top-0 h-4 bg-linear-to-b from-white to-transparent',
          top ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden
        className={clsx(
          'pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-white to-transparent',
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
        className={clsx(disabled && 'opacity-60', icon === spark && 'grayscale brightness-[0.65]')}
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
        'relative flex size-8 shrink-0 items-center justify-center rounded-control',
        active || expanded ? 'bg-chip' : !disabled && 'hover:bg-hover',
        disabled && 'cursor-default'
      )}
    >
      <Icon
        src={icon}
        size={iconSize}
        className={clsx(disabled && 'opacity-60', icon === spark && 'grayscale brightness-[0.65]')}
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
  const openWaiting = useOpenWaiting();
  const newWorkflow = useNewWorkflow();
  const n = d.waiting.length;

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center pt-2">
      <button
        type="button"
        aria-label="Expand sidebar"
        title={`Open ${d.workspace} sidebar (${MOD}K to search)`}
        aria-expanded={false}
        onClick={onExpand}
        className="group mb-2 flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-accent-soft"
      >
        <Icon src={logo} size={36} />
      </button>
      <div className="mb-2 shrink-0"><RailButton icon={search} iconSize={14} label="Search workflows" onClick={() => { onExpand(); focusSearch(); }} /></div>
      <nav aria-label="Main" className="flex shrink-0 flex-col gap-px">
        <RailButton icon={workflowsIcon} iconSize={18} label="Workflows" active={d.page === '1.1'} onClick={() => go('1.1')} />
        <RailButton icon={spark} iconSize={20} label="New workflow" onClick={newWorkflow} />
        <RailButton icon={settings16} iconSize={18} label="Workspace settings" active={d.page === '1.2'} onClick={() => go('1.2', { returnHere: true, state: { section: 'general' } })} />
        <RailPop
          button={(open, toggle) => (
            <RailButton
              icon={bell}
              iconSize={18}
              label="Needs you"
              badge={n}
              expanded={open}
              onClick={toggle}
            />
          )}
        >
          {(close) => (
            <div role="dialog" aria-label="Needs you" className={FLYOUT}>
              <FlyoutTitle>Needs you</FlyoutTitle>
              {d.waiting.length ? d.waiting.map((wf) => (
                <WorkflowRow
                  key={wf.id}
                  wf={wf}
                  active={false}
                  onClick={() => {
                    close();
                    openWaiting(wf);
                  }}
                />
              )) : <p className="px-2 pb-2 text-[12px] text-muted">Nothing needs you right now.</p>}
            </div>
          )}
        </RailPop>
      </nav>
      <div className="min-h-3 flex-1" />
      <div className="flex shrink-0 flex-col items-center">
        <RailPop
          button={(open, toggle) => (
            <button
              type="button"
              aria-label="Help"
              title="Help"
              aria-expanded={open}
              onClick={toggle}
              className="mb-2 flex size-8 shrink-0 items-center justify-center rounded-control text-[18px] font-semibold text-muted hover:bg-hover"
            >?</button>
          )}
        >
          {() => (
            <div role="dialog" aria-label="Help" className={`${FLYOUT} top-auto bottom-0 gap-2 p-3 text-[12px] leading-[18px] text-ink-2`}>
              <HelpDetails />
            </div>
          )}
        </RailPop>
        <div className="flex h-[57px] items-center">
        <RailPop
          button={(open, toggle) => (
            <button
              type="button"
              aria-label={`Account: ${YOU.name}`}
              title={YOU.name}
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={toggle}
              className="relative flex size-8 items-center justify-center rounded-full bg-[#d8edf8] text-[11px] font-semibold text-[#267599]"
            >
              {YOU.initial}
              <span aria-label="Online" className="absolute -right-px bottom-0 size-2 rounded-full bg-ok ring-2 ring-white" />
            </button>
          )}
        >
          {() => <AccountDetails className="absolute bottom-0 left-full ml-3 w-[224px]" />}
        </RailPop>
        </div>
      </div>
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

function AccountDetails({ className }: { className: string }) {
  return <div role="dialog" aria-label="Account" className={clsx('z-40 rounded-card border border-line-2 bg-white p-4 shadow-lg', className)}>
    <p className="text-[13px] font-semibold text-ink">{YOU.name}</p>
    <p className="mt-1 text-[12px] text-muted">{YOU.role} · Local workspace</p>
    <p className="mt-3 text-[12px] leading-[18px] text-muted">This local demo has no sign-in or account settings.</p>
  </div>;
}

function HelpDetails() {
  return <><p className="font-semibold text-ink">Your workspace</p><p className="mt-2">Use Workflows to find your work, or {MOD}K to search.</p><p className="mt-2">Start a new workflow with a brief, shape your team, then start the run. Needs you shows requests for your input.</p></>;
}
