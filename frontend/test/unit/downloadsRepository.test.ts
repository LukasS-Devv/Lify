import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { getDownload, listDownloads, removeDownload, saveDownload } from '../../src/database/repositories/downloads';
import { runMigrations, type MigrationDb } from '../../src/database/migrate';
import type { Db, SqlValue } from '../../src/database/types';

function createDb(raw: DatabaseSync): Db & MigrationDb {
  return {
    async getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null> {
      return (raw.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]> {
      return raw.prepare(sql).all(...params) as T[];
    },
    async runAsync(sql: string, ...params: SqlValue[]) {
      const result = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    async execAsync(sql: string): Promise<void> {
      raw.exec(sql);
    },
    isInTransactionSync(): boolean {
      return raw.isTransaction;
    },
    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

test('download records are saved, listed, updated, and removed by track id', async () => {
  const raw = new DatabaseSync(':memory:');
  const db = createDb(raw);
  await runMigrations(db);
  await db.runAsync(
    `INSERT INTO tracks (id, source, source_id, title, artist, album, duration_sec, artwork_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    'yt:abcdefghijk', 'youtube', 'abcdefghijk', 'Track', 'Artist', null, null, '',
  );

  await saveDownload(db, 'yt:abcdefghijk', 'file:///private/downloads/track.m4a', 100);
  const saved = await getDownload(db, 'yt:abcdefghijk');
  assert.ok(saved);
  assert.deepEqual({ ...saved }, {
    track_id: 'yt:abcdefghijk',
    local_path: 'file:///private/downloads/track.m4a',
    downloaded_at: 100,
  });
  assert.equal((await listDownloads(db, ['yt:abcdefghijk'])).length, 1);

  await saveDownload(db, 'yt:abcdefghijk', 'file:///private/downloads/retry.m4a', 200);
  assert.equal((await getDownload(db, 'yt:abcdefghijk'))?.downloaded_at, 200);
  await removeDownload(db, 'yt:abcdefghijk');
  assert.equal(await getDownload(db, 'yt:abcdefghijk'), null);
  raw.close();
});
