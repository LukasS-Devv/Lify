import { getDb, playlistsRepo } from '@/database';
import type { Track } from '@/types';
import { createLocalTrack } from '@/utils/localTrack';
import { createWebFileId, saveWebFile, pickWebFiles, deleteWebFile } from './webFiles';

export type LocalAudioImportResult =
  | { status: 'cancelled' }
  | { status: 'imported'; added: number; skipped: number };

export async function importLocalAudioToPlaylist(playlistId: number): Promise<LocalAudioImportResult> {
  const files = await pickWebFiles('audio/*', true);
  if (!files.length) return { status: 'cancelled' };

  const savedIds: string[] = [];
  const tracks: Track[] = [];
  try {
    for (const [index, file] of files.entries()) {
      if (file.size === 0) throw new Error(`The selected audio file is empty: ${file.name}`);
      const sourceId = createWebFileId('web-audio');
      await saveWebFile(sourceId, file, file.name || `audio-${index}`);
      savedIds.push(sourceId);
      tracks.push(createLocalTrack(sourceId, sourceId, file.name || `audio-${index}`));
    }

    const added = await playlistsRepo.addTracksToPlaylist(await getDb(), playlistId, tracks);
    return { status: 'imported', added, skipped: tracks.length - added };
  } catch (error) {
    await Promise.all(savedIds.map((id) => deleteWebFile(id)));
    throw error;
  }
}
