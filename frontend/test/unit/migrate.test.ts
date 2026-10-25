import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations, DatabaseRecoveryError, type MigrationDb } from '../../src/database/migrate';
import type { Migration } from '../../src/database/migrations';

/** Adapta `node:sqlite` à interface usada pelo runner. */
function adapter(db: DatabaseSync): MigrationDb {
  return {
    async getFirstAsync<T>(sql: string): Promise<T | null> {
      return (db.prepare(sql).get() as T | undefined) ?? null;
    },
    async execAsync(sql: string): Promise<void> {
      db.exec(sql);
    },
    isInTransactionSync(): boolean {
      return db.isTransaction;
    },
  };
}

const sample: Migration[] = [
  { version: 1, name: 'init', sql: 'CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT);' },
  { version: 2, name: 'add-column', sql: 'ALTER TABLE t ADD COLUMN extra TEXT;' },
];

test('applies every pending migration and records the version', async () => {
  const raw = new DatabaseSync(':memory:');
  const db = adapter(raw);

  await runMigrations(db, sample);

  assert.equal(raw.prepare('PRAGMA user_version').get()!.user_version, 2);
  const cols = raw.prepare('PRAGMA table_info(t)').all() as { name: string }[];
  assert.deepEqual(cols.map((c) => c.name), ['id', 'name', 'extra']);
});

test('is idempotent: a second run applies nothing', async () => {
  const raw = new DatabaseSync(':memory:');
  const db = adapter(raw);

  await runMigrations(db, sample);
  await runMigrations(db, sample);

  assert.equal(raw.prepare('PRAGMA user_version').get()!.user_version, 2);
});

test('skips migrations already covered by user_version', async () => {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT); PRAGMA user_version = 1;');
  const db = adapter(raw);

  await runMigrations(db, sample);

  assert.equal(raw.prepare('PRAGMA user_version').get()!.user_version, 2);
  const cols = raw.prepare('PRAGMA table_info(t)').all() as { name: string }[];
  assert.deepEqual(cols.map((c) => c.name), ['id', 'name', 'extra']);
});

test('a failing migration rolls back and leaves the version untouched', async () => {
  const raw = new DatabaseSync(':memory:');
  const db = adapter(raw);
  const broken: Migration[] = [
    { version: 1, name: 'init', sql: 'CREATE TABLE t (id INTEGER PRIMARY KEY);' },
    { version: 2, name: 'broken', sql: 'THIS IS NOT SQL;' },
  ];

  await assert.rejects(() => runMigrations(db, broken), DatabaseRecoveryError);

  // A migration 1 continua aplicada; a 2 não avançou a versão nem abriu transação.
  assert.equal(raw.prepare('PRAGMA user_version').get()!.user_version, 1);
  assert.equal(raw.isTransaction, false);
});

test('regression: never opens a nested transaction', async () => {
  const raw = new DatabaseSync(':memory:');
  const db = adapter(raw);
  const seen: boolean[] = [];
  const spy: MigrationDb = {
    ...db,
    async execAsync(sql: string) {
      // "cannot start a transaction within a transaction" acontecia aqui.
      if (sql.startsWith('BEGIN')) {
        assert.equal(raw.isTransaction, false, 'BEGIN issued while a transaction was open');
        seen.push(true);
      }
      return db.execAsync(sql);
    },
  };

  await runMigrations(spy, sample);

  assert.equal(seen.length, 2);
});

test('regression: each migration is one self-contained transaction on a single connection', async () => {
  const raw = new DatabaseSync(':memory:');
  const db = adapter(raw);
  const statements: string[] = [];
  const spy: MigrationDb = {
    ...db,
    async execAsync(sql: string) {
      statements.push(sql);
      return db.execAsync(sql);
    },
  };

  await runMigrations(spy, sample);

  // Uma única chamada por migration: nada de BEGIN/COMMIT separados, que era o
  // que permitia a segunda conexão do withExclusiveTransactionAsync colidir.
  assert.equal(statements.length, 2);
  for (const sql of statements) {
    assert.match(sql, /^BEGIN;/);
    assert.match(sql, /COMMIT;$/);
    assert.equal(sql.match(/BEGIN;/g)!.length, 1);
  }
  assert.equal(raw.isTransaction, false);
});

test('the real migration list applies cleanly from scratch', async () => {
  const raw = new DatabaseSync(':memory:');
  const db = adapter(raw);

  await runMigrations(db);

  const tables = raw
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as { name: string }[];
  const names = tables.map((t) => t.name);
  for (const expected of ['tracks', 'playlists', 'playlist_tracks', 'favorites', 'history', 'settings', 'catalog_cache']) {
    assert.ok(names.includes(expected), `missing table ${expected}`);
  }
  assert.equal(raw.prepare('PRAGMA user_version').get()!.user_version, 6);
  const columns = raw.prepare("PRAGMA table_info('playlists')").all() as { name: string }[];
  assert.ok(columns.some((c) => c.name === 'pinned'), 'missing playlists.pinned');
  const downloadColumns = raw.prepare("PRAGMA table_info('downloads')").all() as { name: string }[];
  assert.deepEqual(downloadColumns.map((column) => column.name), ['track_id', 'local_path', 'downloaded_at']);
});
