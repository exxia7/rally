import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Workflow } from '../shared/domain.ts';
export function openDatabase(
  filename = process.env.DATABASE_PATH || '.data/pathfinder.sqlite'
) {
  if (filename !== ':memory:')
    mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    'PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, data TEXT NOT NULL);'
  );
  return {
    load: () =>
      (
        db.prepare('SELECT data FROM workflows').all() as { data: string }[]
      ).map((row) => JSON.parse(row.data) as Workflow),
    save: (w: Workflow) =>
      db
        .prepare(
          'INSERT INTO workflows (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data'
        )
        .run(w.id, JSON.stringify(w)),
    close: () => db.close(),
  };
}
