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
}

export interface HistoryEntry {
  track: Track;
  playedAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface AppSettings {
  repeatMode: RepeatMode;
  autoQueue: boolean; // preencher fila automaticamente com relacionadas
  historyEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  repeatMode: 'off',
  autoQueue: true,
  historyEnabled: true,
};
