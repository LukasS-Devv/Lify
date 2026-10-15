/**
 * Subconjunto da API do expo-sqlite usado pelos repositórios.
 * Permite testar a lógica em Node (node:sqlite) sem o runtime nativo.
 */
export type SqlValue = string | number | null;

export interface Db {
  runAsync(sql: string, ...params: SqlValue[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
