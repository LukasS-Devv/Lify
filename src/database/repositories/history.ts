import type { HistoryEntry, Track } from '@/types';
import type { Db } from '../types';
import { rowToTrack, upsertTrack, type TrackRow } from './tracks';

const MAX_HISTORY = 500;

export async function recordPlay(db: Db, track: Track, at = Date.now()): Promise<void> {
  await db.withTransactionAsync(async () => {
    await upsertTrack(db, track);
    // evita duplicar a mesma faixa em sequência (ex.: repeat one)
    const last = await db.getFirstAsync<{ track_id: string }>(
      'SELECT track_id FROM history ORDER BY played_at DESC, id DESC LIMIT 1');
    if (last?.track_id === track.id) {
      await db.runAsync(
        'UPDATE history SET played_at = ? WHERE id = (SELECT id FROM history ORDER BY played_at DESC, id DESC LIMIT 1)', at);
    } else {
      await db.runAsync('INSERT INTO history (track_id, played_at) VALUES (?, ?)', track.id, at);
    }
    await db.runAsync(
      `DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY played_at DESC, id DESC LIMIT ${MAX_HISTORY})`);
  });
}

export async function listHistory(db: Db, limit = 100): Promise<HistoryEntry[]> {
  const rows = await db.getAllAsync<TrackRow & { played_at: number }>(
    `SELECT t.*, h.played_at FROM history h JOIN tracks t ON t.id = h.track_id
     ORDER BY h.played_at DESC, h.id DESC LIMIT ?`, limit);
  return rows.map((r) => ({ track: rowToTrack(r), playedAt: r.played_at }));
}

export async function clearHistory(db: Db): Promise<void> {
  await db.runAsync('DELETE FROM history');
}
