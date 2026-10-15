import type { Track } from '@/types';

export const makeTrackId = (sourceId: string) => `youtube:${sourceId}`;

export const thumbnailFor = (videoId: string) =>
  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '--:--';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

export function makeTrack(input: {
  sourceId: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  durationSec?: number | null;
}): Track {
  return {
    id: makeTrackId(input.sourceId),
    source: 'youtube',
    sourceId: input.sourceId,
    title: input.title || 'Sem título',
    artist: input.artist || 'Artista desconhecido',
    album: input.album ?? null,
    durationSec: input.durationSec ?? null,
    artworkUrl: thumbnailFor(input.sourceId),
  };
}
