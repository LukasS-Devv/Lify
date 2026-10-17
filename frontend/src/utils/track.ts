import type { Track } from '@/types';
import { t } from '@/i18n';

export const makeTrackId = (sourceId: string) => `youtube:${sourceId}`;

export const thumbnailFor = (videoId: string) =>
  `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

export function highResolutionImageUrl(url: string): string {
  return url
    .replace(/=w\d+-h\d+/i, '=w1200-h1200')
    .replace(/\/hqdefault(?=\.[a-z]+(?:[?#]|$))/i, '/maxresdefault');
}

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
    title: input.title || t('track.untitled'),
    artist: input.artist || t('track.unknownArtist'),
    album: input.album ?? null,
    durationSec: input.durationSec ?? null,
    artworkUrl: thumbnailFor(input.sourceId),
  };
}

/** Duração total legível (ex.: "1 h 12 min"). Ignora faixas sem duração. */
export function formatTotalDuration(tracks: readonly Track[]): string {
  const total = tracks.reduce((acc, tr) => acc + (tr.durationSec ?? 0), 0);
  const min = Math.round(total / 60);
  if (min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
