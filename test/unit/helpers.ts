import { DatabaseSync } from 'node:sqlite';
import type { Db, SqlValue } from '../../src/database/types';
import { migrations } from '../../src/database/migrations';
import type { Track } from '../../src/types';
import { makeTrack } from '../../src/utils/track';

/** Adapta node:sqlite à interface Db usada pelos repositórios. */
export function memoryDb(): Db & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  for (const m of migrations) raw.exec(m.sql);
  raw.exec(`PRAGMA user_version = ${migrations[migrations.length - 1].version}`);
  return {
    raw,
    async runAsync(sql, ...p: SqlValue[]) {
      const r = raw.prepare(sql).run(...p);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async getAllAsync<T>(sql: string, ...p: SqlValue[]) { return raw.prepare(sql).all(...p) as T[]; },
    async getFirstAsync<T>(sql: string, ...p: SqlValue[]) { return (raw.prepare(sql).get(...p) as T) ?? null; },
    async withTransactionAsync(task) {
      raw.exec('BEGIN');
      try { await task(); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
  };
}

export const T = (id: string, title = `Song ${id}`): Track => makeTrack({ sourceId: id, title, artist: 'Artist', durationSec: 180 });
