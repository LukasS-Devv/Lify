import { useCallback } from 'react';
import { getDb, playlistsRepo } from '@/database';
import { useFocusLoad } from '@/utils/useFocusLoad';
import type { PlaylistSummary, Track } from '@/types';

export function usePlaylists() {
  const state = useFocusLoad<PlaylistSummary[]>(async () => playlistsRepo.listPlaylists(await getDb()), []);
  const create = useCallback(async (name: string, coverUrl: string | null = null) => {
    const id = await playlistsRepo.createPlaylist(await getDb(), name, null, coverUrl);
    await state.reload();
    return id;
  }, [state.reload]);
  const setPinned = useCallback(async (id: number, pinned: boolean) => {
    await playlistsRepo.setPlaylistPinned(await getDb(), id, pinned);
    await state.reload();
  }, [state.reload]);
  return { ...state, create, setPinned };
}

const NO_MEMBERSHIP = new Map<string, number>();

export function usePlaylistByTrack() {
  return useFocusLoad<Map<string, number>>(async () => playlistsRepo.playlistByTrack(await getDb()), NO_MEMBERSHIP);
}

export function usePlaylistDetail(id: number) {
  const state = useFocusLoad<{ playlist: PlaylistSummary | null; tracks: Track[] }>(async () => {
    const db = await getDb();
    return { playlist: await playlistsRepo.getPlaylist(db, id), tracks: await playlistsRepo.getPlaylistTracks(db, id) };
  }, { playlist: null, tracks: [] });

  const rename = useCallback(async (name: string) => {
    await playlistsRepo.renamePlaylist(await getDb(), id, name);
    await state.reload();
  }, [id, state.reload]);
  const remove = useCallback(async () => playlistsRepo.deletePlaylist(await getDb(), id), [id]);
  const setPinned = useCallback(async (pinned: boolean) => {
    await playlistsRepo.setPlaylistPinned(await getDb(), id, pinned);
    await state.reload();
  }, [id, state.reload]);
  const removeTrack = useCallback(async (t: Track) => {
    await playlistsRepo.removeTrackFromPlaylist(await getDb(), id, t.id);
    await state.reload();
  }, [id, state.reload]);
  const move = useCallback(async (from: number, to: number) => {
    await playlistsRepo.moveTrackInPlaylist(await getDb(), id, from, to);
    await state.reload();
  }, [id, state.reload]);

  return { ...state, rename, remove, setPinned, removeTrack, move };
}
