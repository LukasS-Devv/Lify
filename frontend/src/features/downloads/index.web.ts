import { create } from 'zustand';
import type { Track } from '@/types';
import { downloadsRepo, getDb, settingsRepo, tracksRepo } from '@/database';
import { getStreamServerUrl } from '@/services/catalog/server';
import { t } from '@/i18n';
import { createWebFileId, deleteWebFile, getWebFile, getWebFileUrl, saveWebFile } from '@/storage/webFiles';
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

interface DownloadedTracksStore {
  trackIds: Set<string>;
  revisions: Record<string, number>;
  setDownloaded: (trackId: string, downloaded: boolean) => void;
}

export const useDownloadedTracksStore = create<DownloadedTracksStore>((set) => ({
  trackIds: new Set(),
  revisions: {},
  setDownloaded: (trackId, downloaded) => set((state) => {
    if (state.trackIds.has(trackId) === downloaded) return state;
    const trackIds = new Set(state.trackIds);
    if (downloaded) trackIds.add(trackId);
    else trackIds.delete(trackId);
    return {
      trackIds,
      revisions: { ...state.revisions, [trackId]: (state.revisions[trackId] ?? 0) + 1 },
    };
  }),
}));

const activeDownloads = new Map<string, TrackDownloadTask>();

export class DownloadCancelledError extends Error {
  constructor() {
    super(t('downloads.cancelled'));
    this.name = 'DownloadCancelledError';
  }
}

export function isDownloadCancelled(error: unknown): boolean {
  return error instanceof DownloadCancelledError;
}

export class DownloadedTrackUnavailableError extends Error {
  constructor(readonly trackId: string) {
    super(t('downloads.fileMissing'));
    this.name = 'DownloadedTrackUnavailableError';
  }
}

export async function getTrackDownloadState(trackId: string): Promise<TrackDownloadState> {
  const record = await downloadsRepo.getDownload(await getDb(), trackId);
  if (!record) return { status: 'none' };
  const file = await getWebFile(record.local_path);
  return {
    status: file?.blob.size ? 'available' : 'invalid',
    localPath: record.local_path,
    downloadedAt: record.downloaded_at,
  };
}

export async function getDownloadedTrackIds(trackIds: string[]): Promise<Set<string>> {
  if (trackIds.length === 0) return new Set();
  const records = await downloadsRepo.listDownloads(await getDb(), trackIds);
  const valid = await Promise.all(records.map(async (record) => (
    (await getWebFile(record.local_path))?.blob.size ? record.track_id : null
  )));
  return new Set(valid.filter((trackId): trackId is string => trackId !== null));
}

export async function removeTrackDownload(trackId: string): Promise<void> {
  const db = await getDb();
  const record = await downloadsRepo.getDownload(db, trackId);
  if (record?.local_path.startsWith('web-download:')) await deleteWebFile(record.local_path);
  await downloadsRepo.removeDownload(db, trackId);
  useDownloadedTracksStore.getState().setDownloaded(trackId, false);
}

export function startTrackDownload(
  track: Track,
  onProgress: (progress: DownloadProgress) => void = () => {},
  force = false,
): TrackDownloadTask {
  if (track.source !== 'youtube') throw new Error(t('downloads.unsupported'));
  if (activeDownloads.has(track.id)) throw new Error(t('downloads.alreadyInProgress'));

  const controller = new AbortController();
  let cancelled = false;
  const promise = (async () => {
    const state = await getTrackDownloadState(track.id);
    if (cancelled) throw new DownloadCancelledError();
    if (state.status === 'available' && !force) {
      useDownloadedTracksStore.getState().setDownloaded(track.id, true);
      return { localPath: state.localPath, alreadyDownloaded: true };
    }

    const settings = await settingsRepo.loadSettings(await getDb());
    const url = `${getStreamServerUrl(settings)}/download/${encodeURIComponent(track.sourceId)}?profile=dataSaver`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(t('downloads.httpError', { status: response.status }));
    const totalBytes = Number(response.headers.get('content-length')) || 0;
    const chunks: ArrayBuffer[] = [];
    let bytesWritten = 0;
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (cancelled) throw new DownloadCancelledError();
        const copy = new Uint8Array(value.length);
        copy.set(value);
        chunks.push(copy.buffer);
        bytesWritten += value.length;
        onProgress({
          fraction: totalBytes > 0 ? Math.min(1, bytesWritten / totalBytes) : null,
          bytesWritten,
          totalBytes,
        });
      }
    } else {
      const bytes = new Uint8Array(await response.arrayBuffer());
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes);
      chunks.push(copy.buffer);
      bytesWritten = bytes.length;
    }
    if (cancelled) throw new DownloadCancelledError();
    if (!bytesWritten) throw new Error(t('downloads.emptyFile'));

    const audioBlob = new Blob(chunks, { type: response.headers.get('content-type') || 'audio/mpeg' });
    const localPath = createWebFileId('web-download');
    await saveWebFile(localPath, audioBlob, `${track.id}.${audioBlob.type.split('/')[1] || 'audio'}`);
    const db = await getDb();
    try {
      await db.withTransactionAsync(async () => {
        await tracksRepo.upsertTrack(db, track);
        if (cancelled) throw new DownloadCancelledError();
        await downloadsRepo.saveDownload(db, track.id, localPath, Date.now());
        if (cancelled) throw new DownloadCancelledError();
      });
    } catch (error) {
      await deleteWebFile(localPath);
      throw error;
    }
    if (state.status !== 'none' && state.localPath.startsWith('web-download:') && state.localPath !== localPath) {
      try {
        await deleteWebFile(state.localPath);
      } catch (error) {
        console.warn('[downloads] Could not remove the replaced download', error);
      }
    }
    useDownloadedTracksStore.getState().setDownloaded(track.id, true);
    return { localPath, alreadyDownloaded: false };
  })().catch((error: unknown) => {
    if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new DownloadCancelledError();
    }
    throw error;
  });

  const task: TrackDownloadTask = {
    promise,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      controller.abort();
    },
  };
  activeDownloads.set(track.id, task);
  void promise.then(
    () => { if (activeDownloads.get(track.id) === task) activeDownloads.delete(track.id); },
    () => { if (activeDownloads.get(track.id) === task) activeDownloads.delete(track.id); },
  );
  return task;
}

export async function resolveDownloadedTrack(
  trackId: string,
): Promise<{ uri: string; mimeType: string | null } | null> {
  const state = await getTrackDownloadState(trackId);
  if (state.status === 'none') return null;
  if (state.status === 'invalid') throw new DownloadedTrackUnavailableError(trackId);
  const uri = await getWebFileUrl(state.localPath);
  if (!uri) throw new DownloadedTrackUnavailableError(trackId);
  const file = await getWebFile(state.localPath);
  return { uri, mimeType: file?.blob.type || null };
}
