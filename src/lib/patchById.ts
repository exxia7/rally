// Copy a list of records keyed by `id`, merging per-id overrides (`null` removes a key such as `flag` or `avatar`).
// Run variants (stuck, rerun, fork) start from one workflow's map and patch the nodes that differ.
export function patchById<T extends { id: string }>(
  items: T[],
  patches: Partial<Record<string, { [K in keyof T]?: T[K] | null }>>,
  all?: { [K in keyof T]?: T[K] | null }
): T[] {
  return items.map((item) => {
    const merged: Record<string, unknown> = {
      ...item,
      ...all,
      ...patches[item.id],
    };
    for (const k of Object.keys(merged))
      if (merged[k] === null) delete merged[k];
    return merged as T;
  });
}
