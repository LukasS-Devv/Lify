export type TrackSource = 'youtube';

/** Faixa do catálogo. `id` = `${source}:${sourceId}` para evitar colisões entre provedores. */
export interface Track {
  id: string;
  source: TrackSource;
  sourceId: string; // videoId no YouTube
  title: string;
  artist: string;
  album: string | null;
  durationSec: number | null;
  artworkUrl: string;
}

export interface Playlist {
  id: number;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PlaylistSummary extends Playlist {
  trackCount: number;
  coverUrl: string | null;
  customCoverUrl: string | null;
}

export interface HistoryEntry {
  track: Track;
  playedAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';
export type PlaybackMode = 'dataSaver' | 'standard';

export interface AppSettings {
  language: 'pt' | 'en';
  repeatMode: RepeatMode;
  playbackMode: PlaybackMode;
  autoQueue: boolean; // preencher fila automaticamente com relacionadas
  historyEnabled: boolean;
  customStreamServerUrl: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'pt',
  repeatMode: 'off',
  playbackMode: 'standard',
  autoQueue: true,
  historyEnabled: true,
  customStreamServerUrl: '',
};
