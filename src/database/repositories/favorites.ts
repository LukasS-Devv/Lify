import type { Track } from '@/types';
import type { Db } from '../types';
import { rowToTrack, upsertTrack, type TrackRow } from './tracks';

export async function listFavorites(db: Db): Promise<Track[]> {
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT t.* FROM favorites f JOIN tracks t ON t.id = f.track_id ORDER BY f.added_at DESC`);
  return rows.map(rowToTrack);
}

export async function isFavorite(db: Db, trackId: string): Promise<boolean> {
  return (await db.getFirstAsync('SELECT 1 AS x FROM favorites WHERE track_id = ?', trackId)) != null;
}

/** Alterna o favorito e devolve o novo estado. */
export async function toggleFavorite(db: Db, track: Track): Promise<boolean> {
  let now = false;
  await db.withTransactionAsync(async () => {
    if (await isFavorite(db, track.id)) {
      await db.runAsync('DELETE FROM favorites WHERE track_id = ?', track.id);
      now = false;
    } else {
      await upsertTrack(db, track);
      await db.runAsync('INSERT INTO favorites (track_id, added_at) VALUES (?, ?)', track.id, Date.now());
      now = true;
    }
  });
  return now;
}
