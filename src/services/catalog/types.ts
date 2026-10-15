import type { Track } from '@/types';

export interface StreamInfo {
  url: string;
  mimeType: string | null;
  /** epoch ms em que a URL expira (se conhecido) */
  expiresAt: number | null;
  headers?: Record<string, string>;
}

/**
 * Contrato do catálogo. A UI e o player só conhecem esta interface, então
 * trocar a biblioteca de extração (youtubei.js → outro fork) afeta 1 arquivo.
 */
export interface CatalogProvider {
  search(query: string): Promise<Track[]>;
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
