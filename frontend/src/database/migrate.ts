import { migrations, type Migration } from './migrations';

/**
 * Subconjunto do expo-sqlite usado pelo runner de migrations.
 * Mantém a lógica testável em Node (`node:sqlite`) sem o runtime nativo.
 */
export interface MigrationDb {
  getFirstAsync<T>(sql: string): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
  isInTransactionSync(): boolean;
}

/** Erro de banco que justifica recriar o arquivo do zero. */
export class DatabaseRecoveryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'DatabaseRecoveryError';
  }
}

/** Desfaz uma transação aberta sem mascarar o erro original. */
async function rollbackQuietly(db: MigrationDb): Promise<void> {
  try {
    if (db.isInTransactionSync()) await db.execAsync('ROLLBACK');
  } catch (error) {
    console.warn('[db] Could not roll back the failed transaction', error);
  }
}

/**
 * Executa migrations pendentes.
 *
 * Tudo roda numa única conexão e numa única transação: o SQL da migration e o
 * `PRAGMA user_version` são commitados juntos, então uma falha nunca deixa o
 * schema e a versão fora de sincronia.
 *
 * `withExclusiveTransactionAsync` NÃO é usado de propósito: ele abre uma segunda
 * conexão nativa no mesmo arquivo e emite `BEGIN` nela. Como o resto do app usa
 * `withTransactionAsync` (não exclusivo) na conexão principal, as duas colidiam
 * com "cannot start a transaction within a transaction" — e o `ROLLBACK` de
 * limpeza do expo-sqlite falhava em seguida, travando o app para sempre.
 */
export async function runMigrations(
  db: MigrationDb,
  list: Migration[] = migrations,
): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;

  for (const m of list) {
    if (m.version <= current) continue;
    // PRAGMA não aceita parâmetros; version é um inteiro controlado por nós.
    const sql = `BEGIN;\n${m.sql}\nPRAGMA user_version = ${m.version};\nCOMMIT;`;
    try {
      await db.execAsync(sql);
    } catch (error) {
      await rollbackQuietly(db);
      throw new DatabaseRecoveryError(`Migration ${m.version} (${m.name}) failed`, error);
    }
    current = m.version;
  }
}
