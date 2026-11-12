// Workspace settings data (1.2): permission presets and connected tools. The store seeds the workspace from these
// (src/state/scenes.ts), so 1.2, the plan and the run agree on what's connected.

export const PRESETS = [
  {
    key: 'careful',
    name: 'Careful',
    rules: 'Ask before every choice · posting waits · $0 ads',
  },
  {
    key: 'balanced',
    name: 'Balanced',
    rules: 'Ask when unsure · posting waits · $0 ads',
  },
  {
    key: 'hands-off',
    name: 'Hands-off',
    rules: 'Just go · posting still waits · $50 ads',
  },
];

export const TOOLS = [
  {
    name: 'Discord',
    detail: '#launches · used in 2 workflows',
    connected: true,
  },
  {
    name: 'Email (Resend)',
    detail: 'hello@lumen.app · used in 3 workflows',
    connected: true,
  },
  { name: 'X', detail: '@lumenapp · used in 3 workflows', connected: true },
  { name: 'LinkedIn', detail: 'Not connected', connected: false },
];

