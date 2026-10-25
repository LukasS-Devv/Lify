import type { Track } from '@/types';
import type { Db } from '../types';

export interface TrackRow {
  id: string;
  source: Track['source'];
  source_id: string;
  title: string;
  artist: string;
  album: string | null;
  duration_sec: number | null;
  artwork_url: string;
}

export const rowToTrack = (r: TrackRow): Track => ({
  id: r.id,
  source: r.source,
  sourceId: r.source_id,
  title: r.title,
  artist: r.artist,
  album: r.album,
  durationSec: r.duration_sec,
  artworkUrl: r.artwork_url,
});

/** Insere ou atualiza os metadados da faixa (as demais tabelas referenciam tracks.id). */
export async function upsertTrack(db: Db, t: Track): Promise<void> {
  await db.runAsync(
    `INSERT INTO tracks (id, source, source_id, title, artist, album, duration_sec, artwork_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, artist = excluded.artist, album = excluded.album,
       duration_sec = excluded.duration_sec, artwork_url = excluded.artwork_url`,
    t.id, t.source, t.sourceId, t.title, t.artist, t.album, t.durationSec, t.artworkUrl,
  );
}
