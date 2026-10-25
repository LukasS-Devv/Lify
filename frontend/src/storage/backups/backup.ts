import * as SQLite from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { strFromU8, strToU8, Unzip, UnzipInflate, UnzipPassThrough, Zip, ZipPassThrough } from 'fflate';
import { getDb, runMigrations } from '@/database/client';
import { LATEST_VERSION } from '@/database/migrations';
import { copyAllData } from './copyData';
import { AUTO_BACKUP_FILE_NAME, portableBackupFileName } from './fileNames';
import { t } from '@/i18n';

const BACKUP_DIR = 'backups';
const AUDIO_DIR = 'audio';
const DOWNLOADS_DIR = 'downloads';
const BACKUP_CHUNK_SIZE = 256 * 1024;
const MAX_DATABASE_BYTES = 64 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_RESTORED_AUDIO_BYTES = 2 * 1024 * 1024 * 1024;

interface PortableBackupManifest {
  format: 'lify-portable-backup';
  version: 1 | 2;
  tracks: { trackId: string; file: string }[];
  downloads?: { trackId: string; file: string }[];
}

interface LocalTrackBackupRow {
  id: string;
  source_id: string;
}

interface DownloadBackupRow {
  track_id: string;
  local_path: string;
}

function backupFileName(prefix = 'lify-backup') {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${ms}.db`;
}

function ensureBackupDir(): Directory {
  const dir = new Directory(Paths.document, BACKUP_DIR);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function ensureAudioDir(): Directory {
  const dir = new Directory(Paths.document, AUDIO_DIR);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function ensureDownloadsDir(): Directory {
  const dir = new Directory(Paths.document, DOWNLOADS_DIR);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function joinChunks(chunks: Uint8Array[], size: number): Uint8Array {
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function localAudioDestination(name: string): File {
  const extension = name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] ?? '';
  return new File(
    ensureAudioDir(),
    `restored-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${extension}`,
  );
}

function downloadedAudioDestination(name: string): File {
  const extension = name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] ?? '';
  return new File(
    ensureDownloadsDir(),
    `restored-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${extension}`,
  );
}

async function streamFileIntoZip(zip: Zip, name: string, source: Uint8Array | File): Promise<void> {
  const entry = new ZipPassThrough(name);
  zip.add(entry);
  if (source instanceof Uint8Array) {
    entry.push(source, true);
    return;
  }

  const handle = source.open(FileMode.ReadOnly);
  try {
    const size = handle.size ?? 0;
    if (size === 0) entry.push(new Uint8Array(), true);
    for (let offset = 0; offset < size; offset += BACKUP_CHUNK_SIZE) {
      const bytes = handle.readBytes(Math.min(BACKUP_CHUNK_SIZE, size - offset));
      entry.push(bytes, offset + bytes.length >= size);
      if ((offset / BACKUP_CHUNK_SIZE) % 4 === 3) await yieldToEventLoop();
    }
  } finally {
    handle.close();
  }
}

async function writePortableArchive(
  entries: { name: string; data: Uint8Array | File }[],
  prefix = 'lify-backup',
): Promise<File> {
  const fileName = portableBackupFileName(prefix, new Date());
  const archive = new File(ensureBackupDir(), `${fileName}.tmp`);
  const destination = new File(ensureBackupDir(), fileName);
  archive.create({ overwrite: true });
  const output = archive.open(FileMode.WriteOnly);
  let outputClosed = false;
  let writeError: unknown;
  let resolveEnd!: () => void;
  let rejectEnd!: (error: Error) => void;
  const finished = new Promise<void>((resolve, reject) => {
    resolveEnd = resolve;
    rejectEnd = reject;
  });
  const zip = new Zip((error, chunk, final) => {
    if (error) {
      writeError = error;
      rejectEnd(error);
      return;
    }
    try {
      output.writeBytes(chunk);
      if (final) resolveEnd();
    } catch (writeFailure) {
      writeError = writeFailure;
      rejectEnd(writeFailure instanceof Error ? writeFailure : new Error(String(writeFailure)));
    }
  });

  try {
    for (const entry of entries) {
      if (writeError) throw writeError;
      await streamFileIntoZip(zip, entry.name, entry.data);
    }
    zip.end();
    await finished;
    output.close();
    outputClosed = true;
    await archive.move(destination, { overwrite: true });
    return archive;
  } catch (error) {
    zip.terminate();
    if (archive.exists) archive.delete();
    throw error;
  } finally {
    if (!outputClosed) output.close();
  }
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

/** Creates a portable archive containing the database, imported audio, and downloads. */
export async function createPortableBackupFile(prefix = 'lify-backup'): Promise<File> {
  const db = await getDb();
  const rows = await db.getAllAsync<LocalTrackBackupRow>(
    "SELECT id, source_id FROM tracks WHERE source = 'local' ORDER BY id",
  );
  const downloadRows = await db.getAllAsync<DownloadBackupRow>(
    'SELECT track_id, local_path FROM downloads ORDER BY track_id',
  );
  const fileByUri = new Map<string, { archiveName: string; file: File }>();
  const downloadByUri = new Map<string, { archiveName: string; file: File }>();
  const manifest: PortableBackupManifest = {
    format: 'lify-portable-backup',
    version: 2,
    tracks: [],
    downloads: [],
  };
  const audioEntries: { name: string; data: File }[] = [];
  const downloadEntries: { name: string; data: File }[] = [];
  let totalAudioBytes = 0;

  for (const row of rows) {
    let audio = fileByUri.get(row.source_id);
    if (!audio) {
      const file = new File(row.source_id);
      const audioRoot = ensureAudioDir().uri.endsWith('/') ? ensureAudioDir().uri : `${ensureAudioDir().uri}/`;
      if (!file.exists || (file.size ?? 0) <= 0 || !row.source_id.startsWith(audioRoot)) {
        throw new Error(`Local audio for track ${row.id} is missing; portable backup was not created.`);
      }
      totalAudioBytes += file.size ?? 0;
      if (totalAudioBytes > MAX_RESTORED_AUDIO_BYTES) throw new BackupError(t('backup.tooLarge'));
      const archiveName = `audio/${audioEntries.length}${file.extension}`;
      audio = { archiveName, file };
      fileByUri.set(row.source_id, audio);
      audioEntries.push({ name: archiveName, data: file });
    }
    manifest.tracks.push({ trackId: row.id, file: audio.archiveName });
  }

  const downloadsDirectory = ensureDownloadsDir();
  const downloadsRoot = downloadsDirectory.uri.endsWith('/')
    ? downloadsDirectory.uri
    : `${downloadsDirectory.uri}/`;
  for (const row of downloadRows) {
    let download = downloadByUri.get(row.local_path);
    if (!download) {
      const file = new File(row.local_path);
      if (!file.exists || (file.size ?? 0) <= 0 || !row.local_path.startsWith(downloadsRoot)) {
        throw new Error(t('backup.downloadMissing', { trackId: row.track_id }));
      }
      totalAudioBytes += file.size ?? 0;
      if (totalAudioBytes > MAX_RESTORED_AUDIO_BYTES) throw new BackupError(t('backup.tooLarge'));
      const archiveName = `downloads/${downloadEntries.length}${file.extension}`;
      download = { archiveName, file };
      downloadByUri.set(row.local_path, download);
      downloadEntries.push({ name: archiveName, data: file });
    }
    manifest.downloads!.push({ trackId: row.track_id, file: download.archiveName });
  }

  const database = await serializeDatabase();
  const manifestBytes = strToU8(JSON.stringify(manifest));
  if (database.length > MAX_DATABASE_BYTES || manifestBytes.length > MAX_MANIFEST_BYTES) {
    throw new BackupError(t('backup.tooLarge'));
  }
  const entries = [
    { name: 'database.db', data: database },
    { name: 'manifest.json', data: manifestBytes },
    ...audioEntries,
    ...downloadEntries,
  ];
  return writePortableArchive(entries, prefix);
}

/**
 * Bytes 18 e 19 do cabeçalho SQLite indicam o modo de journal (2 = WAL).
 * `deserialize` não aceita WAL, então forçamos o modo rollback (1).
 */
function normalizeSqliteHeader(bytes: Uint8Array): Uint8Array {
  if (bytes[18] !== 2 && bytes[19] !== 2) return bytes;
  const fixed = bytes.slice();
  fixed[18] = 1;
  fixed[19] = 1;
  return fixed;
}

/** Serializa o banco atual para um arquivo SQLite local de segurança. */
export async function createBackupFile(prefix?: string): Promise<File> {
  const bytes = await serializeDatabase();
  const file = new File(ensureBackupDir(), backupFileName(prefix));
  file.create({ overwrite: true });
  file.write(bytes);
  return file;
}

/** Exporta o banco, áudios importados e downloads para um backup portátil. */
export async function exportBackup(): Promise<{ uri: string; shared: boolean }> {
  const file = await createPortableBackupFile();
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/zip',
      dialogTitle: t('backup.dialogTitle'),
      UTI: 'public.zip-archive',
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
 * Importa um backup portátil ou um .db legado; valida o schema e substitui os dados atuais.
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
  const header = src.open(FileMode.ReadOnly);
  let isPortableArchive = false;
  try {
    if ((header.size ?? 0) >= 4) {
      const signature = header.readBytes(4);
      isPortableArchive = signature[0] === 0x50 && signature[1] === 0x4b;
    }
  } finally {
    header.close();
  }
  if (isPortableArchive) {
    return importPortableArchive(src);
  }
  return importFromBytes(new Uint8Array(await src.arrayBuffer()));
}

async function importPortableArchive(source: File): Promise<ImportResult> {
  const audioFiles = new Map<string, File>();
  const downloadFiles = new Map<string, File>();
  const dbChunks: Uint8Array[] = [];
  const manifestChunks: Uint8Array[] = [];
  let dbSize = 0;
  let manifestSize = 0;
  let audioSize = 0;
  let unzipError: Error | null = null;
  let seenDatabase = false;
  let seenManifest = false;
  const openAudioHandles = new Set<ReturnType<File['open']>>();
  const unzip = new Unzip((entry) => {
    const name = entry.name;
    if (name === 'database.db') {
      if (seenDatabase) throw new BackupError(t('backup.unreadable'));
      seenDatabase = true;
      entry.ondata = (error, chunk) => {
        if (error) unzipError = error;
        else {
          dbSize += chunk.length;
          if (dbSize > MAX_DATABASE_BYTES) unzipError = new BackupError(t('backup.tooLarge'));
          else dbChunks.push(chunk);
        }
      };
    } else if (name === 'manifest.json') {
      if (seenManifest) throw new BackupError(t('backup.unreadable'));
      seenManifest = true;
      entry.ondata = (error, chunk) => {
        if (error) unzipError = error;
        else {
          manifestSize += chunk.length;
          if (manifestSize > MAX_MANIFEST_BYTES) unzipError = new BackupError(t('backup.tooLarge'));
          else manifestChunks.push(chunk);
        }
      };
    } else if (/^(audio|downloads)\/[a-zA-Z0-9._-]{1,128}$/.test(name)) {
      const isDownload = name.startsWith('downloads/');
      const files = isDownload ? downloadFiles : audioFiles;
      if (!seenManifest || files.has(name)) throw new BackupError(t('backup.unreadable'));
      const destination = isDownload ? downloadedAudioDestination(name) : localAudioDestination(name);
      destination.create({ intermediates: true });
      const handle = destination.open(FileMode.WriteOnly);
      openAudioHandles.add(handle);
      files.set(name, destination);
      entry.ondata = (error, chunk, final) => {
        try {
          if (error) unzipError = error;
          else {
            audioSize += chunk.length;
            if (audioSize > MAX_RESTORED_AUDIO_BYTES) {
              unzipError = new BackupError(t('backup.tooLarge'));
            } else {
              handle.writeBytes(chunk);
            }
          }
        } catch (writeError) {
          unzipError = writeError instanceof Error ? writeError : new Error(String(writeError));
        } finally {
          if (final) {
            handle.close();
            openAudioHandles.delete(handle);
          }
        }
      };
    } else {
      unzipError = new BackupError(t('backup.unreadable'));
      entry.ondata = (error) => { if (error) unzipError = error; };
    }
    try {
      entry.start();
    } catch (error) {
      unzipError = error instanceof Error ? error : new Error(String(error));
    }
  });
  unzip.register(UnzipPassThrough);
  unzip.register(UnzipInflate);

  const input = source.open(FileMode.ReadOnly);
  try {
    if ((input.size ?? 0) > MAX_RESTORED_AUDIO_BYTES + MAX_DATABASE_BYTES + MAX_MANIFEST_BYTES) {
      throw new BackupError(t('backup.tooLarge'));
    }
    const size = input.size ?? 0;
    for (let offset = 0; offset < size; offset += BACKUP_CHUNK_SIZE) {
      unzip.push(input.readBytes(Math.min(BACKUP_CHUNK_SIZE, size - offset)), offset + BACKUP_CHUNK_SIZE >= size);
      if (unzipError) throw unzipError;
      if ((offset / BACKUP_CHUNK_SIZE) % 4 === 3) await yieldToEventLoop();
    }
  } catch (error) {
    for (const handle of openAudioHandles) handle.close();
    for (const file of [...audioFiles.values(), ...downloadFiles.values()]) if (file.exists) file.delete();
    throw error;
  } finally {
    input.close();
  }

  try {
    if (unzipError) throw unzipError;
    if (!seenDatabase || !seenManifest) throw new BackupError(t('backup.unreadable'));
    const manifest = JSON.parse(strFromU8(joinChunks(manifestChunks, manifestSize))) as PortableBackupManifest;
    if (
      manifest.format !== 'lify-portable-backup'
      || (manifest.version !== 1 && manifest.version !== 2)
      || !Array.isArray(manifest.tracks)
      || (manifest.downloads !== undefined && !Array.isArray(manifest.downloads))
      || (manifest.version === 2 && !Array.isArray(manifest.downloads))
    ) {
      throw new BackupError(t('backup.unreadable'));
    }
    const uriByTrack = new Map<string, string>();
    const downloadUriByTrack = new Map<string, string>();
    const usedFiles = new Set<string>();
    for (const item of manifest.tracks) {
      const file = audioFiles.get(item.file);
      if (!file || typeof item.trackId !== 'string' || (file.size ?? 0) <= 0) {
        throw new BackupError(t('backup.unreadable'));
      }
      uriByTrack.set(item.trackId, file.uri);
      usedFiles.add(item.file);
    }
    for (const item of manifest.downloads ?? []) {
      const file = downloadFiles.get(item.file);
      if (!file || typeof item.trackId !== 'string' || (file.size ?? 0) <= 0) {
        throw new BackupError(t('backup.unreadable'));
      }
      downloadUriByTrack.set(item.trackId, file.uri);
      usedFiles.add(item.file);
    }
    for (const [name, file] of [...audioFiles, ...downloadFiles]) {
      if (usedFiles.has(name)) continue;
      file.delete();
      if (name.startsWith('downloads/')) downloadFiles.delete(name);
      else audioFiles.delete(name);
    }
    const result = await importFromBytes(joinChunks(dbChunks, dbSize), uriByTrack, downloadUriByTrack);
    return result;
  } catch (error) {
    for (const handle of openAudioHandles) handle.close();
    for (const file of [...audioFiles.values(), ...downloadFiles.values()]) if (file.exists) file.delete();
    throw error;
  }
}

export async function importFromBytes(
  bytes: Uint8Array,
  localAudioUris?: Map<string, string>,
  downloadUris?: Map<string, string>,
): Promise<ImportResult> {
  let incoming: SQLite.SQLiteDatabase;
  try {
    incoming = await SQLite.deserializeDatabaseAsync(normalizeSqliteHeader(bytes));
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
    if (localAudioUris) {
      const localTracks = await incoming.getAllAsync<{ id: string }>(
        "SELECT id FROM tracks WHERE source = 'local'",
      );
      for (const track of localTracks) {
        const uri = localAudioUris.get(track.id);
        if (!uri) throw new BackupError(t('backup.unreadable'));
        await incoming.runAsync('UPDATE tracks SET source_id = ? WHERE id = ?', uri, track.id);
      }
    }
    if (downloadUris) {
      const downloadedTracks = await incoming.getAllAsync<{ track_id: string }>(
        'SELECT track_id FROM downloads',
      );
      if (downloadUris.size !== downloadedTracks.length) throw new BackupError(t('backup.unreadable'));
      for (const track of downloadedTracks) {
        const uri = downloadUris.get(track.track_id);
        if (!uri) throw new BackupError(t('backup.unreadable'));
        await incoming.runAsync(
          'UPDATE downloads SET local_path = ? WHERE track_id = ?',
          uri,
          track.track_id,
        );
      }
    } else {
      await incoming.runAsync('DELETE FROM downloads');
    }
    const safety = await createPortableBackupFile();
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
    .filter((e): e is File => e instanceof File && (e.name.endsWith('.db') || e.name.endsWith('.lifybackup')))
    .map((f) => ({ name: f.name, uri: f.uri, size: f.size ?? 0 }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

export async function removeLegacyAutomaticBackups(): Promise<void> {
  for (const backup of listLocalBackups()) {
    if (!backup.name.startsWith('lify-auto-backup-') || backup.name === AUTO_BACKUP_FILE_NAME) continue;
    await new File(backup.uri).delete();
  }
}
