import { create } from 'zustand';
import { favoritesRepo, getDb } from '@/database';
import type { Track } from '@/types';

interface FavoriteFeedbackStore {
  track: Track | null;
  nonce: number;
  pickerOpen: boolean;
  /** Incrementa quando os favoritos mudam fora do player, para ele reler o estado. */
  favoritesVersion: number;
  show: (track: Track) => void;
  hide: () => void;
  setPickerOpen: (open: boolean) => void;
}

export const useFavoriteFeedbackStore = create<FavoriteFeedbackStore>((set) => ({
  track: null,
  nonce: 0,
  pickerOpen: false,
  favoritesVersion: 0,
  show: (track) => set((s) => ({ track, nonce: s.nonce + 1 })),
  hide: () => set({ track: null, pickerOpen: false }),
  setPickerOpen: (pickerOpen) => set({ pickerOpen }),
}));

export function bumpFavoritesVersion() {
  useFavoriteFeedbackStore.setState((s) => ({ favoritesVersion: s.favoritesVersion + 1 }));
}

/** Alterna o favorito e, ao adicionar, mostra o banner com a opção de alterar playlists. */
export async function toggleFavoriteWithFeedback(track: Track): Promise<boolean> {
  const now = await favoritesRepo.toggleFavorite(await getDb(), track);
  if (now) useFavoriteFeedbackStore.getState().show(track);
  return now;
}
