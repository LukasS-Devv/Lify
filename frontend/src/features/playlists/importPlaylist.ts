import { getDb, playlistsRepo } from '@/database';
import { getPublicMusicPlaylist } from '@/services/catalog/youtube';
import type { Track } from '@/types';
import { ImportError, parsePlaylistLink } from './importPlaylistHelpers';

export { ImportError, parsePlaylistLink } from './importPlaylistHelpers';

export interface PlaylistImportPreview {
  name: string;
  sourceUrl: string;
  tracks: Track[];
  truncated: boolean;
}

/** Lê a playlist pública sem gravar nada — a UI mostra a prévia antes de confirmar. */
export async function previewPlaylistImport(inputUrl: string): Promise<PlaylistImportPreview> {
  const parsed = parsePlaylistLink(inputUrl);
  const playlist = await getPublicMusicPlaylist(parsed.playlistId);
  return { name: playlist.name, sourceUrl: parsed.canonicalUrl, tracks: playlist.tracks, truncated: playlist.truncated };
}

/** Cria a playlist + faixas atomicamente e devolve o id. */
export async function savePlaylistImport(preview: PlaylistImportPreview): Promise<number> {
  if (!preview.tracks.length) throw new ImportError('noMatches');
  return playlistsRepo.createPlaylistWithTracks(await getDb(), preview.name, preview.tracks);
}
