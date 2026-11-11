export type Tool = { name: string; source: 'Built in' | 'Connected' };

/** Every tool a helper can be given (Figma "Tool row" list in 2.4b and 2.4b-full). */
export const TOOLS: Tool[] = [
  { name: 'Web search', source: 'Built in' },
  { name: 'Docs', source: 'Built in' },
  { name: 'Image maker', source: 'Built in' },
  { name: 'Calendar', source: 'Built in' },
  { name: 'Email', source: 'Connected' },
  { name: 'X', source: 'Connected' },
  { name: 'LinkedIn', source: 'Connected' },
  { name: 'Discord', source: 'Connected' },
];
