import * as SQLite from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { getDb, runMigrations } from '@/database/client';
import { LATEST_VERSION } from '@/database/migrations';
import { copyAllData } from './copyData';
import { t } from '@/i18n';

const BACKUP_DIR = 'backups';

function backupFileName(prefix = 'lify-backup') {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.db`;
}

function ensureBackupDir(): Directory {
  const dir = new Directory(Paths.document, BACKUP_DIR);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Serializa o banco atual para um arquivo .db dentro de documents/backups. */
export async function createBackupFile(prefix?: string): Promise<File> {
  const db = await getDb();
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  const bytes = await db.serializeAsync();
  const file = new File(ensureBackupDir(), backupFileName(prefix));
  file.create({ overwrite: true });
  file.write(bytes);
  return file;
}

/** Exporta: gera o .db e abre a folha de compartilhamento/salvar do sistema. */
export async function exportBackup(): Promise<{ uri: string; shared: boolean }> {
  const file = await createBackupFile();
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.sqlite3',
      dialogTitle: t('backup.dialogTitle'),
      UTI: 'public.database',
    });
  }
  return { uri: file.uri, shared: canShare };
}

/** Erro de validação mostrado ao usuário (distinto de falhas internas). */
export class BackupError extends Error {}

export type ImportResult =
  | { status: 'cancelled' }
  | { status: 'ok'; safetyBackupUri: string };

/**
 * Importa: o usuário escolhe um .db; ele é validado (abre como SQLite, versão
 * suportada), migrado para o schema atual e seus dados SUBSTITUEM os atuais.
 * Antes disso é criado um backup de segurança do estado atual.
 */
export async function importBackup(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) return { status: 'cancelled' };

  const src = new File(picked.assets[0].uri);
  const bytes = new Uint8Array(await src.arrayBuffer());
  return importFromBytes(bytes);
}

export async function importFromBytes(bytes: Uint8Array): Promise<ImportResult> {
  let incoming: SQLite.SQLiteDatabase;
  try {
    incoming = await SQLite.deserializeDatabaseAsync(bytes);
    const v = await incoming.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((v?.user_version ?? 0) > LATEST_VERSION) {
      await incoming.closeAsync();
      throw new BackupError(t('backup.tooNew'));
    }
    if ((v?.user_version ?? 0) === 0) {
      await incoming.closeAsync();
      throw new BackupError(t('backup.notLify'));
    }
    await runMigrations(incoming);
  } catch (e) {
    if (e instanceof BackupError) throw e;
    throw new BackupError(t('backup.unreadable'));
  }

  try {
    const safety = await createBackupFile('lify-antes-da-importacao');
    const db = await getDb();
    await copyAllData(incoming, db);
    return { status: 'ok', safetyBackupUri: safety.uri };
  } finally {
    await incoming.closeAsync();
  }
}

export function listLocalBackups(): { name: string; uri: string; size: number }[] {
  const dir = ensureBackupDir();
  return dir
    .list()
    .filter((e): e is File => e instanceof File && e.name.endsWith('.db'))
    .map((f) => ({ name: f.name, uri: f.uri, size: f.size ?? 0 }))
    .sort((a, b) => b.name.localeCompare(a.name));
}
