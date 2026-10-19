import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrate';

export { runMigrations, DatabaseRecoveryError } from './migrate';

export const DB_NAME = 'lify.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** `PRAGMA integrity_check` retorna 'ok' quando o arquivo está saudável. */
async function isHealthy(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const row = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
    return row?.integrity_check === 'ok';
  } catch (error) {
    console.warn('[db] integrity_check could not run', error);
    return false;
  }
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  return db;
}

/**
 * Recria o banco do zero. É a única saída para um arquivo corrompido — sem isso
 * o app fica preso no erro de inicialização e só um uninstall resolve.
 */
export async function resetDatabase(): Promise<SQLite.SQLiteDatabase> {
  dbPromise = null;
  try {
    await SQLite.deleteDatabaseAsync(DB_NAME);
  } catch (error) {
    console.warn('[db] Could not delete the database file', error);
  }
  const db = await openAndMigrate();
  dbPromise = Promise.resolve(db);
  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch(async (error: unknown) => {
      dbPromise = null; // permite nova tentativa
      console.error('[db] Startup failed; checking database integrity', error);
      // Se o arquivo está corrompido, recriar é a única forma de o app abrir.
      // Se está saudável, o erro é de código/migration e deve ser propagado.
      try {
        const probe = await SQLite.openDatabaseAsync(DB_NAME);
        const healthy = await isHealthy(probe);
        await probe.closeAsync().catch(() => undefined);
        if (!healthy) return resetDatabase();
      } catch (probeError) {
        console.warn('[db] Could not inspect the database after a startup failure', probeError);
        return resetDatabase();
      }
      throw error;
    });
  }
  return dbPromise;
}
