import * as SQLite from 'expo-sqlite';
import {
  strFromU8, strToU8, Unzip, UnzipInflate, UnzipPassThrough, Zip, ZipPassThrough,
} from 'fflate';
import { getDb, runMigrations } from '@/database/client';
import { LATEST_VERSION } from '@/database/migrations';
import { copyAllData } from './copyData';
import { portableBackupFileName } from './fileNames';
import { getWebFile, listWebFiles, saveWebFile, createWebFileId, deleteWebFile, downloadBlob, pickWebFiles } from '@/storage/webFiles';
import { t } from '@/i18n';

const MAX_DATABASE_BYTES = 64 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_RESTORED_AUDIO_BYTES = 512 * 1024 * 1024;
const BACKUP_CHUNK_SIZE = 256 * 1024;

interface PortableBackupManifest {
  format: 'lify-portable-backup';
  version: 1 | 2;
  tracks: { trackId: string; file: string }[];
  downloads?: { trackId: string; file: string }[];
}

function joinChunks(chunks: ArrayBuffer[], size: number): Uint8Array {
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  return result;
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function zipEntries(entries: Record<string, Blob | Uint8Array>): Promise<Blob> {
  const chunks: ArrayBuffer[] = [];
  let zipError: Error | null = null;
  let resolveEnd!: () => void;
  let rejectEnd!: (error: Error) => void;
  const finished = new Promise<void>((resolve, reject) => {
    resolveEnd = resolve;
    rejectEnd = reject;
  });
  const zip = new Zip((error, chunk, final) => {
    if (error) {
      zipError = error;
      rejectEnd(error);
    } else {
      const copy = new Uint8Array(chunk.length);
      copy.set(chunk);
      chunks.push(copy.buffer);
      if (final) resolveEnd();
    }
  });
  try {
    for (const [name, data] of Object.entries(entries)) {
      if (zipError) throw zipError;
      const entry = new ZipPassThrough(name);
      zip.add(entry);
      const size = data instanceof Blob ? data.size : data.length;
      for (let offset = 0; offset < size; offset += BACKUP_CHUNK_SIZE) {
        const part = data instanceof Blob
          ? new Uint8Array(await data.slice(offset, offset + BACKUP_CHUNK_SIZE).arrayBuffer())
          : data.subarray(offset, Math.min(size, offset + BACKUP_CHUNK_SIZE));
        entry.push(part, offset + part.length >= size);
        if ((offset / BACKUP_CHUNK_SIZE) % 4 === 3) await yieldToEventLoop();
      }
      if (size === 0) entry.push(new Uint8Array(), true);
    }
    zip.end();
    await finished;
  } catch (error) {
    zip.terminate();
    throw error;
  }
  return new Blob(chunks, { type: 'application/zip' });
}

function mimeType(name: string): string {
  const extension = name.toLowerCase().split('.').pop();
  if (extension === 'm4a' || extension === 'mp4') return 'audio/mp4';
  if (extension === 'webm') return 'audio/webm';
  if (extension === 'ogg' || extension === 'opus') return 'audio/ogg';
  if (extension === 'wav') return 'audio/wav';
  return 'audio/mpeg';
}

async function serializeDatabase(): Promise<Uint8Array> {
  const db = await getDb();
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  await db.execAsync('PRAGMA journal_mode = DELETE');
  try {
    return await db.serializeAsync();
  } finally {
    await db.execAsync('PRAGMA journal_mode = WAL');
  }
}

async function archiveFiles(
  prefix = 'lify-backup',
  includeDownloads = true,
): Promise<{ fileName: string; blob: Blob }> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; source_id: string }>(
    "SELECT id, source_id FROM tracks WHERE source = 'local' ORDER BY id",
  );
  const downloadRows = includeDownloads
    ? await db.getAllAsync<{ track_id: string; local_path: string }>(
        'SELECT track_id, local_path FROM downloads ORDER BY track_id',
      )
    : [];
  const mediaEntries: Record<string, Blob> = {};
  const manifest: PortableBackupManifest = { format: 'lify-portable-backup', version: 2, tracks: [], downloads: [] };
  const audioNames = new Map<string, string>();
  const downloadNames = new Map<string, string>();
  let totalAudioBytes = 0;

  for (const row of rows) {
    let name = audioNames.get(row.source_id);
    if (!name) {
      const file = await getWebFile(row.source_id);
      if (!file || !row.source_id.startsWith('web-audio:') || file.blob.size === 0) {
        throw new Error(`Local audio for track ${row.id} is missing; portable backup was not created.`);
      }
      totalAudioBytes += file.blob.size;
      if (totalAudioBytes > MAX_RESTORED_AUDIO_BYTES) throw new Error(t('backup.tooLarge'));
      name = `audio/${audioNames.size}${file.name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] ?? ''}`;
      audioNames.set(row.source_id, name);
      mediaEntries[name] = file.blob;
    }
    manifest.tracks.push({ trackId: row.id, file: name });
  }

  for (const row of downloadRows) {
    let name = downloadNames.get(row.local_path);
    if (!name) {
      const file = await getWebFile(row.local_path);
      if (!file || !row.local_path.startsWith('web-download:') || file.blob.size === 0) {
        throw new Error(t('backup.downloadMissing', { trackId: row.track_id }));
      }
      totalAudioBytes += file.blob.size;
      if (totalAudioBytes > MAX_RESTORED_AUDIO_BYTES) throw new Error(t('backup.tooLarge'));
      name = `downloads/${downloadNames.size}${file.name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] ?? ''}`;
      downloadNames.set(row.local_path, name);
      mediaEntries[name] = file.blob;
    }
    manifest.downloads!.push({ trackId: row.track_id, file: name });
  }

  const database = await serializeDatabase();
  const manifestBytes = strToU8(JSON.stringify(manifest));
  if (database.length > MAX_DATABASE_BYTES || manifestBytes.length > MAX_MANIFEST_BYTES) {
    throw new Error(t('backup.tooLarge'));
  }
  const timestamp = new Date();
  const fileName = portableBackupFileName(prefix, timestamp);
  return {
    fileName,
    blob: await zipEntries({ 'database.db': database, 'manifest.json': manifestBytes, ...mediaEntries }),
  };
}

export async function createPortableBackupFile(prefix = 'lify-backup'): Promise<{ uri: string }> {
  const archive = await archiveFiles(prefix);
  const id = prefix === 'lify-auto-backup'
    ? 'web-backup:lify-auto-backup.lifybackup'
    : createWebFileId('web-backup');
  await saveWebFile(id, archive.blob, archive.fileName);
  return { uri: id };
}

export async function createBackupFile(prefix?: string): Promise<{ uri: string }> {
  return createPortableBackupFile(prefix ?? 'lify-backup');
}

export async function exportBackup(includeDownloads: boolean): Promise<{ uri: string; shared: boolean }> {
  const archive = await archiveFiles('lify-backup', includeDownloads);
  await saveWebFile(`web-backup:${archive.fileName}`, archive.blob, archive.fileName);
  downloadBlob(archive.blob, archive.fileName);
  return { uri: archive.fileName, shared: true };
}

export class BackupError extends Error {}

export type ImportResult =
  | { status: 'cancelled' }
  | { status: 'ok'; safetyBackupUri: string };

export async function importBackup(): Promise<ImportResult> {
  const [file] = await pickWebFiles('.lifybackup,.zip,.db,application/zip,application/octet-stream');
  if (!file) return { status: 'cancelled' };
  if (file.size >= 4) {
    const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (signature[0] === 0x50 && signature[1] === 0x4b) {
      return importPortableArchive(file);
    }
  }
  return importFromBytes(new Uint8Array(await file.arrayBuffer()));
}

async function importPortableArchive(file: File): Promise<ImportResult> {
  let databaseBytes: Uint8Array | null = null;
  const parsedManifest: { value: PortableBackupManifest | null } = { value: null };
  let databaseSize = 0;
  let manifestSize = 0;
  let totalAudioBytes = 0;
  let unzipError: Error | null = null;
  const audioIds = new Map<string, string>();
  const downloadIds = new Map<string, string>();
  const pendingWrites: Promise<void>[] = [];
  const entryNames = new Set<string>();
  const audioUris = new Map<string, string>();
  const downloadUris = new Map<string, string>();
  const savedIds: string[] = [];
  const unzip = new Unzip((entry) => {
    const name = entry.name;
    if (entryNames.has(name)) {
      unzipError = new BackupError(t('backup.unreadable'));
      return;
    }
    entryNames.add(name);
    const chunks: ArrayBuffer[] = [];
    let size = 0;
    if (name !== 'database.db' && name !== 'manifest.json') {
      const isAudio = /^audio\/[a-zA-Z0-9._-]{1,128}$/.test(name);
      const isDownload = /^downloads\/[a-zA-Z0-9._-]{1,128}$/.test(name);
      if ((!isAudio && !isDownload) || !parsedManifest.value) {
        unzipError = new BackupError(t('backup.unreadable'));
      }
    }
    entry.ondata = (error, chunk, final) => {
      if (error) {
        unzipError = error;
        return;
      }
      size += chunk.length;
      if (name === 'database.db') {
        databaseSize += chunk.length;
        if (databaseSize > MAX_DATABASE_BYTES) unzipError = new BackupError(t('backup.tooLarge'));
      } else if (name === 'manifest.json') {
        manifestSize += chunk.length;
        if (manifestSize > MAX_MANIFEST_BYTES) unzipError = new BackupError(t('backup.tooLarge'));
      } else {
        totalAudioBytes += chunk.length;
        if (totalAudioBytes > MAX_RESTORED_AUDIO_BYTES) unzipError = new BackupError(t('backup.tooLarge'));
      }
      if (unzipError) return;
      const copy = new Uint8Array(chunk.length);
      copy.set(chunk);
      chunks.push(copy.buffer);
      if (!final) return;
      if (name === 'database.db') {
        databaseBytes = joinChunks(chunks, size);
      } else if (name === 'manifest.json') {
        try {
          parsedManifest.value = JSON.parse(strFromU8(joinChunks(chunks, size))) as PortableBackupManifest;
          if (
            parsedManifest.value.format !== 'lify-portable-backup'
            || (parsedManifest.value.version !== 1 && parsedManifest.value.version !== 2)
            || !Array.isArray(parsedManifest.value.tracks)
            || (parsedManifest.value.downloads !== undefined && !Array.isArray(parsedManifest.value.downloads))
            || (parsedManifest.value.version === 2 && !Array.isArray(parsedManifest.value.downloads))
          ) throw new BackupError(t('backup.unreadable'));
        } catch (error) {
          unzipError = error instanceof Error ? error : new BackupError(t('backup.unreadable'));
        }
      } else {
        const isDownload = name.startsWith('downloads/');
        const id = createWebFileId(isDownload ? 'web-download' : 'web-audio');
        (isDownload ? downloadIds : audioIds).set(name, id);
        savedIds.push(id);
        const blob = new Blob(chunks, { type: mimeType(name) });
        pendingWrites.push(saveWebFile(id, blob, name));
      }
    };
    entry.start();
  });
  unzip.register(UnzipPassThrough);
  unzip.register(UnzipInflate);

  try {
    if (file.size > MAX_RESTORED_AUDIO_BYTES + MAX_DATABASE_BYTES + MAX_MANIFEST_BYTES) {
      throw new BackupError(t('backup.tooLarge'));
    }
    const reader = file.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      unzip.push(value, false);
      if (unzipError) throw unzipError;
      await yieldToEventLoop();
    }
    unzip.push(new Uint8Array(), true);
    if (unzipError) throw unzipError;
    await Promise.all(pendingWrites);
    const manifest = parsedManifest.value;
    if (!databaseBytes || !manifest) throw new BackupError(t('backup.unreadable'));

    for (const item of manifest.tracks) {
      const id = audioIds.get(item.file);
      const record = id ? await getWebFile(id) : null;
      if (!id || !record || !item.trackId || record.blob.size === 0) throw new BackupError(t('backup.unreadable'));
      audioUris.set(item.trackId, id);
    }
    for (const item of manifest.downloads ?? []) {
      const id = downloadIds.get(item.file);
      const record = id ? await getWebFile(id) : null;
      if (!id || !record || !item.trackId || record.blob.size === 0) throw new BackupError(t('backup.unreadable'));
      downloadUris.set(item.trackId, id);
    }
    if (
      audioIds.size !== new Set(manifest.tracks.map((item) => item.file)).size
      || downloadIds.size !== new Set((manifest.downloads ?? []).map((item) => item.file)).size
    ) {
      throw new BackupError(t('backup.unreadable'));
    }
    const result = await importFromBytes(databaseBytes, audioUris, downloadUris);
    return result;
  } catch (error) {
    await Promise.allSettled(pendingWrites);
    await Promise.all(savedIds.map((id) => deleteWebFile(id)));
    throw error;
  }
}

function normalizeSqliteHeader(bytes: Uint8Array): Uint8Array {
  if (bytes[18] !== 2 && bytes[19] !== 2) return bytes;
  const fixed = bytes.slice();
  fixed[18] = 1;
  fixed[19] = 1;
  return fixed;
}

export async function importFromBytes(
  bytes: Uint8Array,
  localAudioUris?: Map<string, string>,
  downloadUris?: Map<string, string>,
): Promise<ImportResult> {
  let incoming: SQLite.SQLiteDatabase;
  try {
    incoming = await SQLite.deserializeDatabaseAsync(normalizeSqliteHeader(bytes));
    const version = await incoming.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) > LATEST_VERSION) {
      await incoming.closeAsync();
      throw new BackupError(t('backup.tooNew'));
    }
    if ((version?.user_version ?? 0) === 0) {
      await incoming.closeAsync();
      throw new BackupError(t('backup.notLify'));
    }
    await runMigrations(incoming);
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError(t('backup.unreadable'));
  }

  try {
    if (localAudioUris) {
      const rows = await incoming.getAllAsync<{ id: string }>("SELECT id FROM tracks WHERE source = 'local'");
      for (const row of rows) {
        const sourceId = localAudioUris.get(row.id);
        if (!sourceId) throw new BackupError(t('backup.unreadable'));
        await incoming.runAsync('UPDATE tracks SET source_id = ? WHERE id = ?', sourceId, row.id);
      }
    }
    if (downloadUris) {
      const rows = await incoming.getAllAsync<{ track_id: string }>('SELECT track_id FROM downloads');
      if (downloadUris.size !== rows.length) throw new BackupError(t('backup.unreadable'));
      for (const row of rows) {
        const sourceId = downloadUris.get(row.track_id);
        if (!sourceId) throw new BackupError(t('backup.unreadable'));
        await incoming.runAsync('UPDATE downloads SET local_path = ? WHERE track_id = ?', sourceId, row.track_id);
      }
    } else {
      await incoming.runAsync('DELETE FROM downloads');
    }
    const safety = await createPortableBackupFile('lify-safety-backup');
    const db = await getDb();
    await copyAllData(incoming, db);
    const activeDownloadPaths = new Set(
      (await db.getAllAsync<{ local_path: string }>('SELECT local_path FROM downloads'))
        .map((row) => row.local_path),
    );
    for (const file of await listWebFiles('web-download:')) {
      if (!activeDownloadPaths.has(file.id)) {
        try {
          await deleteWebFile(file.id);
        } catch (error) {
          console.warn('[backup] Could not remove an unused browser download', error);
        }
      }
    }
    return { status: 'ok', safetyBackupUri: safety.uri };
  } finally {
    await incoming.closeAsync();
  }
}

export function listLocalBackups(): { name: string; uri: string; size: number }[] {
  return [];
}

export async function removeLegacyAutomaticBackups(): Promise<void> {
  const files = await listWebFiles('web-backup:');
  for (const file of files) {
    if (file.name.startsWith('lify-auto-backup-') && file.name !== 'lify-auto-backup.lifybackup') {
      await deleteWebFile(file.id);
    }
  }
}
