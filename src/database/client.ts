import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';

export const DB_NAME = 'lify.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Executa migrations pendentes dentro de transação. */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;

  for (const m of migrations) {
    if (m.version <= current) continue;
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(m.sql);
    });
    // PRAGMA não aceita parâmetros; version é um inteiro controlado por nós.
    await db.execAsync(`PRAGMA user_version = ${m.version}`);
    current = m.version;
  }
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      await runMigrations(db);
      return db;
    })().catch((e) => {
      dbPromise = null; // permite nova tentativa
      throw e;
    });
  }
  return dbPromise;
}
