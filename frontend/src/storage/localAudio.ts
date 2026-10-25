import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { getDb, playlistsRepo } from '@/database';
import type { Track } from '@/types';
import { createLocalTrack } from '@/utils/localTrack';

const AUDIO_DIR = 'audio';

function ensureAudioDirectory(): Directory {
  const directory = new Directory(Paths.document, AUDIO_DIR);
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

function uniqueFileName(index: number, originalName: string): string {
  const extension = originalName.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] ?? '';
  const unique = `${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 10)}`;
  return `${unique}${extension}`;
}

export type LocalAudioImportResult =
  | { status: 'cancelled' }
  | { status: 'imported'; added: number; skipped: number };

export async function importLocalAudioToPlaylist(playlistId: number): Promise<LocalAudioImportResult> {
  const selection = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (selection.canceled || !selection.assets.length) return { status: 'cancelled' };

  const directory = ensureAudioDirectory();
  const copiedFiles: File[] = [];
  const tracks: Track[] = [];
  try {
    for (const [index, asset] of selection.assets.entries()) {
      const destination = new File(directory, uniqueFileName(index, asset.name));
      await new File(asset.uri).copy(destination);
      copiedFiles.push(destination);
      tracks.push(createLocalTrack(destination.name, destination.uri, asset.name));
    }
    const added = await playlistsRepo.addTracksToPlaylist(await getDb(), playlistId, tracks);
    return { status: 'imported', added, skipped: tracks.length - added };
  } catch (error) {
    for (const file of copiedFiles) {
      try {
        if (file.exists) file.delete();
      } catch (cleanupError) {
        console.warn('[local-audio] Could not remove an unreferenced imported file', cleanupError);
      }
    }
    throw error;
  }
}
