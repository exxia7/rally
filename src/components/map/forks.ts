export type ForkNumber = 1 | 2 | 3;

// Figma styles Branch/Fork 1–3: each fork lane takes the next colour (also @theme --color-fork-N).
export const FORK_COLOR: Record<ForkNumber, string> = {
  1: '#be348a',
  2: '#0d8579',
  3: '#7a4be0',
};
