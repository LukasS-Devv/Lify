import type { TKey } from '@/i18n';

/** Gêneros da grade "Explorar". A busca usa o próprio rótulo traduzido como consulta. */
export const GENRES: { key: TKey; seed: string }[] = [
  { key: 'genre.pop', seed: 'g-pop' },
  { key: 'genre.rock', seed: 'g-rock' },
  { key: 'genre.hiphop', seed: 'g-hiphop' },
  { key: 'genre.electronic', seed: 'g-electronic' },
  { key: 'genre.jazz', seed: 'g-jazz' },  
  { key: 'genre.classical', seed: 'g-classical' },
  { key: 'genre.jpop', seed: 'g-j-pop' },
  { key: 'genre.mpb', seed: 'g-mpb' },
];
