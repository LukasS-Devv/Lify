export type TrackSource = 'youtube' | 'local';

/** Faixa do catálogo ou arquivo local. `id` distingue faixas de fontes diferentes. */
export interface Track {
  id: string;
  source: TrackSource;
  sourceId: string; // videoId do YouTube ou URI local do arquivo
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
  pinned: boolean;
}

export interface HistoryEntry {
  track: Track;
  playedAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one' | 'reverse';

export interface AppSettings {
  language: 'pt' | 'en';
  repeatMode: RepeatMode;
  historyEnabled: boolean;
  autoBackupIntervalDays: 0 | 1 | 7 | 30;
  lastAutoBackupAt: number | null;
  customStreamServerUrl: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'pt',
  repeatMode: 'off',
  historyEnabled: true,
  autoBackupIntervalDays: 0,
  lastAutoBackupAt: null,
  customStreamServerUrl: '',
};
