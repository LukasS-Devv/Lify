import type { Db } from '../types';

export interface DownloadRow {
  track_id: string;
  local_path: string;
  downloaded_at: number;
}

export async function getDownload(db: Db, trackId: string): Promise<DownloadRow | null> {
  return db.getFirstAsync<DownloadRow>(
    'SELECT track_id, local_path, downloaded_at FROM downloads WHERE track_id = ?',
    trackId,
  );
}

export async function listDownloads(db: Db, trackIds?: string[]): Promise<DownloadRow[]> {
  if (trackIds && trackIds.length === 0) return [];
  if (!trackIds) {
    return db.getAllAsync<DownloadRow>(
      'SELECT track_id, local_path, downloaded_at FROM downloads ORDER BY downloaded_at DESC',
    );
  }
  const placeholders = trackIds.map(() => '?').join(', ');
  return db.getAllAsync<DownloadRow>(
    `SELECT track_id, local_path, downloaded_at FROM downloads WHERE track_id IN (${placeholders})`,
    ...trackIds,
  );
}

export async function saveDownload(
  db: Db,
  trackId: string,
  localPath: string,
  downloadedAt: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO downloads (track_id, local_path, downloaded_at)
     VALUES (?, ?, ?)
     ON CONFLICT(track_id) DO UPDATE SET
       local_path = excluded.local_path, downloaded_at = excluded.downloaded_at`,
    trackId,
    localPath,
    downloadedAt,
  );
}

export async function removeDownload(db: Db, trackId: string): Promise<void> {
  await db.runAsync('DELETE FROM downloads WHERE track_id = ?', trackId);
}
