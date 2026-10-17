import type { PlaylistSummary, Track } from '@/types';
import type { Db } from '../types';
import { rowToTrack, upsertTrack, type TrackRow } from './tracks';
import { t } from '@/i18n';

interface PlaylistRow {
  id: number;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
  track_count: number;
  cover_url: string | null;
  track_cover_url: string | null;
}

export async function listPlaylists(db: Db): Promise<PlaylistSummary[]> {
  const rows = await db.getAllAsync<PlaylistRow>(`
    SELECT p.*,
      (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count,
      (SELECT t.artwork_url FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
        WHERE pt.playlist_id = p.id ORDER BY pt.position ASC LIMIT 1) AS track_cover_url
    FROM playlists p ORDER BY p.updated_at DESC`);
  return rows.map(toSummary);
}

export async function getPlaylist(db: Db, id: number): Promise<PlaylistSummary | null> {
  const r = await db.getFirstAsync<PlaylistRow>(
    `SELECT p.*,
      (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count,
      (SELECT t.artwork_url FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
        WHERE pt.playlist_id = p.id ORDER BY pt.position ASC LIMIT 1) AS track_cover_url
     FROM playlists p WHERE p.id = ?`, id);
  return r ? toSummary(r) : null;
}

const toSummary = (r: PlaylistRow): PlaylistSummary => ({
  id: r.id,
  name: r.name,
  description: r.description,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  trackCount: r.track_count,
  coverUrl: r.cover_url ?? r.track_cover_url,
  customCoverUrl: r.cover_url,
});

export async function createPlaylist(
  db: Db,
  name: string,
  description: string | null = null,
  coverUrl: string | null = null,
): Promise<number> {
  const clean = name.trim();
  if (!clean) throw new Error(t('db.playlistNameEmpty'));
  const now = Date.now();
  const res = await db.runAsync(
    'INSERT INTO playlists (name, description, created_at, updated_at, cover_url) VALUES (?, ?, ?, ?, ?)',
    clean, description, now, now, coverUrl,
  );
  return res.lastInsertRowId;
}

/** Cria a playlist e grava as faixas numa única transação (tudo ou nada). */
export async function createPlaylistWithTracks(
  db: Db,
  name: string,
  tracks: Track[],
  coverUrl: string | null = null,
): Promise<number> {
  const clean = name.trim();
  if (!clean) throw new Error(t('db.playlistNameEmpty'));

  let playlistId = 0;
  await db.withTransactionAsync(async () => {
    playlistId = await createPlaylist(db, clean, null, coverUrl);
    const seen = new Set<string>();
    let position = 0;
    for (const track of tracks) {
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      await upsertTrack(db, track);
      await db.runAsync(
        'INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)',
        playlistId, track.id, position++, Date.now(),
      );
    }
  });
  return playlistId;
}

export async function renamePlaylist(db: Db, id: number, name: string): Promise<void> {
  const clean = name.trim();
  if (!clean) throw new Error(t('db.playlistNameEmpty'));
  await db.runAsync('UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?', clean, Date.now(), id);
}

export async function deletePlaylist(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM playlists WHERE id = ?', id);
}

export async function getPlaylistTracks(db: Db, playlistId: number): Promise<Track[]> {
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT t.* FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
     WHERE pt.playlist_id = ? ORDER BY pt.position ASC`, playlistId);
  return rows.map(rowToTrack);
}

/** Adiciona ao final. Retorna false se a faixa já estiver na playlist. */
export async function addTrackToPlaylist(db: Db, playlistId: number, track: Track): Promise<boolean> {
  let added = false;
  await db.withTransactionAsync(async () => {
    await upsertTrack(db, track);
    const exists = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?', playlistId, track.id);
    if (exists) return;
    const max = await db.getFirstAsync<{ m: number | null }>(
      'SELECT MAX(position) AS m FROM playlist_tracks WHERE playlist_id = ?', playlistId);
    const now = Date.now();
    await db.runAsync(
      'INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)',
      playlistId, track.id, (max?.m ?? -1) + 1, now);
    await db.runAsync('UPDATE playlists SET updated_at = ? WHERE id = ?', now, playlistId);
    added = true;
  });
  return added;
}

export async function removeTrackFromPlaylist(db: Db, playlistId: number, trackId: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?', playlistId, trackId);
    // recompacta posições
    const rows = await db.getAllAsync<{ id: number }>(
      'SELECT id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC', playlistId);
    for (let i = 0; i < rows.length; i++) {
      await db.runAsync('UPDATE playlist_tracks SET position = ? WHERE id = ?', i, rows[i].id);
    }
    await db.runAsync('UPDATE playlists SET updated_at = ? WHERE id = ?', Date.now(), playlistId);
  });
}

/** Move a faixa de `from` para `to` (índices 0-based). */
export async function moveTrackInPlaylist(db: Db, playlistId: number, from: number, to: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    const rows = await db.getAllAsync<{ id: number }>(
      'SELECT id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC', playlistId);
    if (from < 0 || from >= rows.length || to < 0 || to >= rows.length || from === to) return;
    const [moved] = rows.splice(from, 1);
    rows.splice(to, 0, moved);
    for (let i = 0; i < rows.length; i++) {
      await db.runAsync('UPDATE playlist_tracks SET position = ? WHERE id = ?', i, rows[i].id);
    }
    await db.runAsync('UPDATE playlists SET updated_at = ? WHERE id = ?', Date.now(), playlistId);
  });
}

export async function playlistIdsContaining(db: Db, trackId: string): Promise<number[]> {
  const rows = await db.getAllAsync<{ playlist_id: number }>(
    'SELECT playlist_id FROM playlist_tracks WHERE track_id = ?', trackId);
  return rows.map((r) => r.playlist_id);
}
