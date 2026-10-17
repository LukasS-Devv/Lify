import { favoritesRepo, getDb, historyRepo } from '@/database';
import { useFocusLoad } from '@/utils/useFocusLoad';
import type { HistoryEntry, Track } from '@/types';

export const useFavorites = () =>
  useFocusLoad<Track[]>(async () => favoritesRepo.listFavorites(await getDb()), []);

export const useHistory = (limit = 100) =>
  useFocusLoad<HistoryEntry[]>(async () => historyRepo.listHistory(await getDb(), limit), []);
