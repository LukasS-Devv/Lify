import type { HistoryEntry, PlaylistSummary, Track } from '@/types';

export type RecentEntry =
  | { kind: 'track'; key: string; track: Track; queueIndex: number }
  | { kind: 'playlist'; key: string; playlist: PlaylistSummary };

/**
 * Uma entrada por faixa/playlist, do mais recente para o mais antigo.
 * Faixa tocada a partir de uma playlist conta só como a playlist.
 */
export function buildRecentEntries(
  history: HistoryEntry[],
  playlistByTrack: ReadonlyMap<string, number>,
  playlistsById: ReadonlyMap<number, PlaylistSummary>,
): RecentEntry[] {
  const seen = new Set<string>();
  const entries: RecentEntry[] = [];
  history.forEach(({ track }, queueIndex) => {
    const playlistId = playlistByTrack.get(track.id);
    const playlist = playlistId === undefined ? undefined : playlistsById.get(playlistId);
    if (playlist) {
      const key = `playlist-${playlist.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({ kind: 'playlist', key, playlist });
      }
      return;
    }
    const key = `track-${track.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      entries.push({ kind: 'track', key, track, queueIndex });
    }
  });
  return entries;
}

/**
 * Mistura as listas em rodadas (um item de cada por vez) até `limit`, sem repetir chaves.
 * Assim cada tipo aparece no topo, e não só o que tem mais itens.
 */
export function interleaveUnique<T>(lists: T[][], limit: number, keyOf: (item: T) => string): T[] {
  const result: T[] = [];
  const seen = new Set<string>();
  const cursors = lists.map(() => 0);
  while (result.length < limit) {
    let progressed = false;
    lists.forEach((list, i) => {
      while (cursors[i] < list.length && result.length < limit) {
        const item = list[cursors[i]++];
        const key = keyOf(item);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(item);
        progressed = true;
        break;
      }
    });
    if (!progressed) break;
  }
  return result;
}
