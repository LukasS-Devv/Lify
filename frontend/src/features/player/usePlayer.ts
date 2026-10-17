import { useEffect, useState } from 'react';
import { favoritesRepo, getDb } from '@/database';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';

/** Estado do player + favorito da faixa atual. */
export function usePlayer() {
  const track = usePlayerStore(selectCurrentTrack);
  const status = usePlayerStore((s) => s.status);
  const error = usePlayerStore((s) => s.error);
  const queue = usePlayerStore((s) => s.queue);
  const repeat = usePlayerStore((s) => s.repeat);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (!track) return setFavorite(false);
    getDb().then((db) => favoritesRepo.isFavorite(db, track.id)).then(setFavorite).catch(() => {});
  }, [track?.id]);

  const toggleFavorite = async () => {
    if (!track) return;
    setFavorite(await favoritesRepo.toggleFavorite(await getDb(), track));
  };

  return { track, status, error, queue, repeat, favorite, toggleFavorite };
}
