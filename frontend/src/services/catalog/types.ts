import type { Track } from '@/types';

export interface StreamInfo {
  url: string;
  mimeType: string | null;
  /** epoch ms em que a URL expira (se conhecido) */
  expiresAt: number | null;
}

export interface CatalogArtist {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string | null;
}

export interface ArtistCollectionItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  kind: 'album' | 'single' | 'ep' | 'playlist' | 'track';
  track?: Track;
}

export interface CatalogCollection {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  tracks: Track[];
}

export interface ArtistProfile extends CatalogArtist {
  description: string;
  tracks: Track[];
  albums: ArtistCollectionItem[];
  singles: ArtistCollectionItem[];
  eps: ArtistCollectionItem[];
  playlists: ArtistCollectionItem[];
  relatedArtists: CatalogArtist[];
}

/**
 * Contrato do catálogo. A UI e o player só conhecem esta interface, então
 * trocar a biblioteca de extração (youtubei.js → outro fork) afeta 1 arquivo.
 */
export interface CatalogProvider {
  search(query: string): Promise<Track[]>;
  searchArtists(query: string): Promise<CatalogArtist[]>;
  getArtist(id: string): Promise<ArtistProfile>;
  getCollection(id: string, kind: 'album' | 'playlist'): Promise<CatalogCollection>;
  suggestions(query: string): Promise<string[]>;
  getStream(track: Track): Promise<StreamInfo>;
  /** Faixas relacionadas/“próximas” para preencher a fila automática. */
  getRelated(track: Track): Promise<Track[]>;
}

export class CatalogError extends Error {
  constructor(
    message: string,
    public readonly code: 'network' | 'unavailable' | 'parse' | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'CatalogError';
  }
}
