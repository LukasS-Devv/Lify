import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File, Paths } from 'expo-file-system';
import type { Track } from '@/types';
import { downloadsRepo, getDb, settingsRepo, tracksRepo } from '@/database';
import { getStreamServerUrl } from '@/services/catalog/server';
import { t } from '@/i18n';

const DOWNLOADS_DIRECTORY = 'downloads';
const directory = () => new Directory(Paths.document, DOWNLOADS_DIRECTORY);
const activeDownloads = new Map<string, TrackDownloadTask>();

export interface DownloadProgress {
  fraction: number | null;
  bytesWritten: number;
  totalBytes: number;
}

export interface TrackDownloadTask {
  promise: Promise<{ localPath: string; alreadyDownloaded: boolean }>;
  cancel: () => void;
}

export type TrackDownloadState =
  | { status: 'none' }
  | { status: 'available'; localPath: string; downloadedAt: number }
  | { status: 'invalid'; localPath: string; downloadedAt: number };

export class DownloadCancelledError extends Error {
  constructor() {
    super(t('downloads.cancelled'));
    this.name = 'DownloadCancelledError';
  }
}

export function isDownloadCancelled(error: unknown): boolean {
  return error instanceof DownloadCancelledError;
}

function ensureDownloadsDirectory(): Directory {
  const dir = directory();
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function isInsideDownloads(localPath: string): boolean {
  const root = directory().uri.endsWith('/') ? directory().uri : `${directory().uri}/`;
  return localPath.startsWith(root);
}

async function hasValidFile(localPath: string): Promise<boolean> {
  if (!isInsideDownloads(localPath)) return false;
  const file = new File(localPath);
  return file.exists && (file.size ?? 0) > 0;
}

export async function getTrackDownloadState(trackId: string): Promise<TrackDownloadState> {
  const record = await downloadsRepo.getDownload(await getDb(), trackId);
  if (!record) return { status: 'none' };
  return {
    status: await hasValidFile(record.local_path) ? 'available' : 'invalid',
    localPath: record.local_path,
    downloadedAt: record.downloaded_at,
  };
}

export async function getDownloadedTrackIds(trackIds: string[]): Promise<Set<string>> {
  if (trackIds.length === 0) return new Set();
  const records = await downloadsRepo.listDownloads(await getDb(), trackIds);
  const valid = await Promise.all(records.map(async (record) => (
    await hasValidFile(record.local_path) ? record.track_id : null
  )));
  return new Set(valid.filter((trackId): trackId is string => trackId !== null));
}

export async function removeTrackDownload(trackId: string): Promise<void> {
  const db = await getDb();
  const record = await downloadsRepo.getDownload(db, trackId);
  if (record && isInsideDownloads(record.local_path)) {
    const file = new File(record.local_path);
    if (file.exists) file.delete();
  }
  await downloadsRepo.removeDownload(db, trackId);
}

function extensionForMimeType(mimeType: string | null): string {
  const mime = mimeType?.split(';', 1)[0].trim().toLowerCase();
  if (mime === 'audio/mp4' || mime === 'audio/x-m4a') return '.m4a';
  if (mime === 'audio/webm') return '.webm';
  if (mime === 'audio/mpeg' || mime === 'audio/mp3') return '.mp3';
  if (mime === 'audio/ogg' || mime === 'audio/opus') return '.ogg';
  return '.audio';
}

function uniqueName(trackId: string, suffix: string): string {
  const safeId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${suffix}`;
}

async function performDownload(
  track: Track,
  onProgress: (progress: DownloadProgress) => void,
  isCancelled: () => boolean,
  setNativeTask: (task: ReturnType<typeof FileSystem.createDownloadResumable>) => void,
  force: boolean,
): Promise<{ localPath: string; alreadyDownloaded: boolean }> {
  if (track.source !== 'youtube') throw new Error(t('downloads.unsupported'));

  const state = await getTrackDownloadState(track.id);
  if (isCancelled()) throw new DownloadCancelledError();
  if (state.status === 'available' && !force) {
    return { localPath: state.localPath, alreadyDownloaded: true };
  }

  const settings = await settingsRepo.loadSettings(await getDb());
  const downloadUrl = `${getStreamServerUrl(settings)}/download/${encodeURIComponent(track.sourceId)}?profile=dataSaver`;
  if (isCancelled()) throw new DownloadCancelledError();

  const dir = ensureDownloadsDirectory();
  const temporaryFile = new File(dir, uniqueName(track.id, '.tmp'));
  const downloadTask = FileSystem.createDownloadResumable(
    downloadUrl,
    temporaryFile.uri,
    undefined,
    ({ totalBytesExpectedToWrite, totalBytesWritten }) => {
      const totalBytes = totalBytesExpectedToWrite;
      onProgress({
        fraction: totalBytes > 0 ? Math.min(1, totalBytesWritten / totalBytes) : null,
        bytesWritten: totalBytesWritten,
        totalBytes,
      });
    },
  );
  setNativeTask(downloadTask);

  let finalFile: File | null = null;
  let promoted = false;
  let failure: unknown;
  try {
    let result: Awaited<ReturnType<typeof downloadTask.downloadAsync>>;
    try {
      result = await downloadTask.downloadAsync();
    } catch (error) {
      if (isCancelled()) throw new DownloadCancelledError();
      throw error;
    }
    if (isCancelled() || !result) throw new DownloadCancelledError();
    if (result.status < 200 || result.status >= 300) {
      throw new Error(t('downloads.httpError', { status: result.status }));
    }
    if (!temporaryFile.exists || (temporaryFile.size ?? 0) <= 0) {
      throw new Error(t('downloads.emptyFile'));
    }

    const promotedFile = new File(dir, uniqueName(track.id, extensionForMimeType(result.mimeType)));
    finalFile = promotedFile;
    await temporaryFile.move(promotedFile);
    if (isCancelled()) throw new DownloadCancelledError();
    if (!promotedFile.exists || (promotedFile.size ?? 0) <= 0) {
      throw new Error(t('downloads.emptyFile'));
    }

    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await tracksRepo.upsertTrack(db, track);
      if (isCancelled()) throw new DownloadCancelledError();
      await downloadsRepo.saveDownload(db, track.id, promotedFile.uri, Date.now());
      if (isCancelled()) throw new DownloadCancelledError();
    });
    if (isCancelled()) {
      await downloadsRepo.removeDownload(db, track.id);
      throw new DownloadCancelledError();
    }
    promoted = true;
    if (state.status !== 'none' && state.localPath !== promotedFile.uri && isInsideDownloads(state.localPath)) {
      try {
        const previousFile = new File(state.localPath);
        if (previousFile.exists) previousFile.delete();
      } catch (error) {
        console.warn('[downloads] Could not remove a replaced download file', error);
      }
    }
    return { localPath: promotedFile.uri, alreadyDownloaded: false };
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (!promoted) {
      let cleanupError: unknown;
      for (const file of [temporaryFile, finalFile]) {
        if (!file?.exists) continue;
        try {
          file.delete();
        } catch (error) {
          cleanupError ??= error;
        }
      }
      if (cleanupError) {
        console.error('[downloads] Could not remove an incomplete download file', cleanupError);
        if (failure === undefined) throw cleanupError;
      }
    }
  }
}

export function startTrackDownload(
  track: Track,
  onProgress: (progress: DownloadProgress) => void = () => {},
  force = false,
): TrackDownloadTask {
  if (activeDownloads.has(track.id)) throw new Error(t('downloads.alreadyInProgress'));

  let cancelled = false;
  let nativeTask: ReturnType<typeof FileSystem.createDownloadResumable> | null = null;
  const promise = performDownload(
    track,
    onProgress,
    () => cancelled,
    (task) => { nativeTask = task; },
    force,
  );
  const handle: TrackDownloadTask = {
    promise,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      if (nativeTask) {
        void nativeTask.cancelAsync().catch((error: unknown) => {
          console.warn('[downloads] Could not cancel the active transfer', error);
        });
      }
    },
  };
  activeDownloads.set(track.id, handle);
  void promise.then(
    () => { if (activeDownloads.get(track.id) === handle) activeDownloads.delete(track.id); },
    () => { if (activeDownloads.get(track.id) === handle) activeDownloads.delete(track.id); },
  );
  return handle;
}

export async function resolveDownloadedTrack(
  trackId: string,
): Promise<{ uri: string; mimeType: string | null } | null> {
  const state = await getTrackDownloadState(trackId);
  if (state.status === 'none') return null;
  if (state.status === 'invalid') throw new DownloadedTrackUnavailableError(trackId);
  return { uri: state.localPath, mimeType: mimeTypeForPath(state.localPath) };
}

export class DownloadedTrackUnavailableError extends Error {
  constructor(readonly trackId: string) {
    super(t('downloads.fileMissing'));
    this.name = 'DownloadedTrackUnavailableError';
  }
}

function mimeTypeForPath(localPath: string): string | null {
  const extension = localPath.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension === 'm4a') return 'audio/mp4';
  if (extension === 'webm') return 'audio/webm';
  if (extension === 'mp3') return 'audio/mpeg';
  if (extension === 'ogg') return 'audio/ogg';
  return null;
}
