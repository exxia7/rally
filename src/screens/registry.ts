// Every Rally frame in Figma (file uL2LNYWjWvYM9rPXjwDwAr, section "Pathfinder · live app screens", from before the rename).
// `id` is the Figma frame number; routes are /s/<id>. `node` is the Figma node id used for design context
// and for the reference screenshot in design/ref/<id>.png.
export type ScreenMeta = {
  id: string;
  node: string;
  name: string;
  chapter: Chapter;
  hidden?: boolean;
};
export type Chapter =
  | 'Home'
  | 'Plan'
  | 'Run'
  | 'Stuck'
  | 'Approve'
  | 'Rerun & fork';

export const SCREENS: ScreenMeta[] = [
  {
    id: '1.1',
    node: '2362:23299',
    name: 'Home · your workflows',
    chapter: 'Home',
  },
  {
    id: '1.2',
    node: '2362:23330',
    name: 'Workspace settings',
    chapter: 'Home',
  },

  { id: '2.1', node: '2362:23498', name: 'Planning · empty', chapter: 'Plan' },
  {
    id: '2.1-attach',
    node: '2362:27498',
    name: 'Planning · attach menu open',
    chapter: 'Plan',
  },
  { id: '2.2', node: '2362:23548', name: 'Chat start', chapter: 'Plan' },
  {
    id: '2.2-attach',
    node: '2362:26366',
    name: 'Chat start · attach menu open',
    chapter: 'Plan',
  },
  { id: '2.3', node: '2362:23641', name: 'Proposed team', chapter: 'Plan' },
  {
    id: '2.4',
    node: '2362:23725',
    name: 'Edit a helper · drawer',
    chapter: 'Plan',
  },
  { id: '2.4b', node: '2362:23869', name: 'Edit on the card', chapter: 'Plan' },
  {
    id: '2.4b-full',
    node: '2362:27783',
    name: 'Edit on the card · full editor',
    chapter: 'Plan',
  },
  {
    id: '2.4c',
    node: '2362:23969',
    name: 'Add a step on a line',
    chapter: 'Plan',
  },
  { id: '2.4d', node: '2362:24093', name: 'Edit by chat', chapter: 'Plan' },
  {
    id: '2.4e',
    node: '2362:27674',
    name: 'Ask before a step runs',
    chapter: 'Plan',
  },
  { id: '2.5', node: '2362:24186', name: 'Add a helper', chapter: 'Plan' },
  {
    id: '2.6',
    node: '2362:24285',
    name: 'Sandbox · drag a resource',
    chapter: 'Plan',
  },
  { id: '2.7', node: '2362:24400', name: 'Permissions', chapter: 'Plan' },
  { id: '2.8', node: '2362:24542', name: 'Workflow settings', chapter: 'Plan' },

  { id: '3.1', node: '2362:24710', name: 'Flowchart · empty', chapter: 'Run' },
  { id: '3.2', node: '2362:24736', name: 'Running', chapter: 'Run' },
  {
    id: '3.2-tasks',
    node: '2362:26475',
    name: 'Running · anchored tasks overlay',
    chapter: 'Run',
  },
  {
    id: '3.3',
    node: '2362:24825',
    name: 'Running · Sandbox open',
    chapter: 'Run',
  },
  {
    id: '3.3-tasks',
    node: '2362:26584',
    name: 'Running · Sandbox open · anchored tasks overlay',
    chapter: 'Run',
  },
  { id: '3.4', node: '2362:24954', name: 'Decision log', chapter: 'Run' },
  {
    id: '3.4-tasks',
    node: '2362:26732',
    name: 'Decision log · anchored tasks overlay',
    chapter: 'Run',
  },
  { id: '3.5', node: '2362:25089', name: 'Inspector', chapter: 'Run' },
  {
    id: '3.5-tasks',
    node: '2362:26887',
    name: 'Inspector · anchored tasks overlay',
    chapter: 'Run',
  },

  {
    id: '4.1',
    node: '2362:27564',
    name: 'Hand raised · 2 things to fix',
    chapter: 'Stuck',
  },
  { id: '4.1b', node: '2362:27019', name: 'Rerun confirm', chapter: 'Stuck' },
  { id: '4.2', node: '2362:25201', name: 'Rerun', chapter: 'Stuck' },
  {
    id: '4.2-tasks',
    node: '2362:27165',
    name: 'Rerun · anchored tasks overlay',
    chapter: 'Stuck',
  },
  { id: '4.3', node: '2362:25290', name: 'Price mismatch', chapter: 'Stuck' },

  { id: '5.1', node: '2362:25491', name: 'Approval', chapter: 'Approve' },
  { id: '5.2', node: '2362:25601', name: 'Launch summary', chapter: 'Approve' },

  {
    id: '6.1',
    node: '2362:25748',
    name: 'Inspector · Rerun or fork',
    chapter: 'Rerun & fork',
  },
  {
    id: '6.2',
    node: '2362:25860',
    name: 'Rerun from here',
    chapter: 'Rerun & fork',
  },
  { id: '6.3', node: '2362:26001', name: 'Rerunning', chapter: 'Rerun & fork' },
  { id: '4.4', node: '2362:25394', name: 'Fork', chapter: 'Rerun & fork' },
  {
    id: '4.5',
    node: '2362:27924',
    name: 'Fork running · from a decision',
    chapter: 'Rerun & fork',
  },
  {
    id: '6.4',
    node: '2362:26113',
    name: 'Fork from here',
    chapter: 'Rerun & fork',
  },
  {
    id: '6.5',
    node: '2362:26232',
    name: 'Fork running',
    chapter: 'Rerun & fork',
  },
  {
    id: '6.6',
    node: '2362:28047',
    name: 'Fork from a fork',
    chapter: 'Rerun & fork',
  },
];

export type ScreenId = (typeof SCREENS)[number]['id'];

// ---- URLs ------------------------------------------------------------------------------------------------------
// The app's URLs. Home is '/', workspace settings '/settings', and every workflow screen lives under its
// workflow: '/w/<workflow id>/<page>' ('/w/ai-coach/run'). Screens still move by frame id (`go('3.2')`); these
// tables translate between the two. Frame ids are internal: they name the Figma frame a screen was built from.

/** Frame id → the page part of a workflow URL. */
export const PAGE_OF: Record<string, string> = {
  '2.1': 'brief',
  '2.1-attach': 'brief-attach',
  '2.2': 'chat',
  '2.2-attach': 'chat-attach',
  '2.3': 'team',
  '2.4': 'team-helper',
  '2.4b': 'team-edit',
  '2.4b-full': 'team-edit-full',
  '2.4c': 'team-add-step',
  '2.4d': 'team-chat-edit',
  '2.4e': 'team-ask-first',
  '2.5': 'team-add-helper',
  '2.6': 'sandbox',
  '2.7': 'permissions',
  '2.8': 'settings',
  '3.1': 'flowchart',
  '3.2': 'run',
  '3.2-tasks': 'run-tasks',
  '3.3': 'run-sandbox',
  '3.3-tasks': 'run-sandbox-tasks',
  '3.4': 'decisions',
  '3.4-tasks': 'decisions-tasks',
  '3.5': 'inspector',
  '3.5-tasks': 'inspector-tasks',
  '4.1': 'needs-you',
  '4.1b': 'rerun-confirm',
  '4.2': 'rerun',
  '4.2-tasks': 'rerun-tasks',
  '4.3': 'price-check',
  '5.1': 'approve',
  '5.2': 'summary',
  '6.1': 'inspector-options',
  '6.2': 'rerun-from-here',
  '6.3': 'rerunning',
  '4.4': 'fork',
  '4.5': 'fork-decision',
  '6.4': 'fork-from-here',
  '6.5': 'fork-running',
  '6.6': 'fork-from-fork',
};
const FRAME_OF: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_OF).map(([id, page]) => [page, id])
);

/** The frame id a workflow page shows ('run' → '3.2'), or undefined for an unknown page. */
export const frameOfPage = (page: string): string | undefined => FRAME_OF[page];

/** The URL of frame `id` for workflow `wf` (Home and workspace settings aren't a workflow's). */
export function screenPath(id: string, wf?: string) {
  if (id === '1.1') return '/';
  if (id === '1.2') return '/settings';
  const page = PAGE_OF[id];
  if (!page || !wf) return '/';
  return `/w/${encodeURIComponent(wf)}/${page}`;
}

/** What a URL shows: its frame id and, for a workflow page, the workflow; null when it's no screen. */
export function parsePath(
  pathname: string
): { id: string; wf?: string } | null {
  if (pathname === '/' || pathname === '') return { id: '1.1' };
  if (pathname === '/settings') return { id: '1.2' };
  const m = /^\/w\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (m) {
    const id = FRAME_OF[m[2]];
    return id ? { id, wf: decodeURIComponent(m[1]) } : null;
  }
  // Dev only: '/s/<frame id>' loads that frame's sample state (the pixel tools use it).
  if (pathname.startsWith('/s/')) return { id: decodeURIComponent(pathname.slice(3)) };
  return null;
}
