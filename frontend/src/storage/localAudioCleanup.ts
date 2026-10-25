import { Directory, File, Paths } from 'expo-file-system';
import { getDb } from '@/database';
import { currentOf } from '@/services/audio/queue';
import { usePlayerStore } from '@/services/audio/store';

const AUDIO_DIRECTORY = new Directory(Paths.document, 'audio');

export async function cleanupUnreferencedLocalAudio(): Promise<void> {
  if (!AUDIO_DIRECTORY.exists) return;
  const db = await getDb();
  const activeTrack = currentOf(usePlayerStore.getState().queue);
  const rows = await db.getAllAsync<{ id: string; source_id: string }>(
    `SELECT t.id, t.source_id FROM tracks t
     WHERE t.source = 'local'
       AND NOT EXISTS (SELECT 1 FROM playlist_tracks pt WHERE pt.track_id = t.id)
       AND NOT EXISTS (SELECT 1 FROM favorites f WHERE f.track_id = t.id)
       AND NOT EXISTS (SELECT 1 FROM history h WHERE h.track_id = t.id)`,
  );
  const removable = rows.filter((row) => row.id !== activeTrack?.id);
  if (removable.length) {
    await db.withTransactionAsync(async () => {
      for (const row of removable) {
        await db.runAsync(
          `DELETE FROM tracks
           WHERE id = ?
             AND NOT EXISTS (SELECT 1 FROM playlist_tracks WHERE track_id = ?)
             AND NOT EXISTS (SELECT 1 FROM favorites WHERE track_id = ?)
             AND NOT EXISTS (SELECT 1 FROM history WHERE track_id = ?)`,
          row.id, row.id, row.id, row.id,
        );
      }
    });
  }

  const liveRows = await db.getAllAsync<{ source_id: string }>(
    "SELECT source_id FROM tracks WHERE source = 'local'",
  );
  const referenced = new Set(liveRows.map((row) => row.source_id));
  if (activeTrack?.source === 'local') referenced.add(activeTrack.sourceId);

  const directoryUri = AUDIO_DIRECTORY.uri.endsWith('/') ? AUDIO_DIRECTORY.uri : `${AUDIO_DIRECTORY.uri}/`;
  for (const entry of AUDIO_DIRECTORY.list()) {
    if (!(entry instanceof File) || !entry.uri.startsWith(directoryUri) || referenced.has(entry.uri)) continue;
    try {
      entry.delete();
    } catch (error) {
      console.warn('[local-audio] Could not remove unreferenced audio', entry.name, error);
    }
  }
}
