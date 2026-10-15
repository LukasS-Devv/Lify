// Importa o build para React Native do youtubei.js.
import { Innertube } from 'youtubei.js/react-native';
import type { Track } from '@/types';
import { makeTrack } from '@/utils/track';
import { CatalogError, type CatalogProvider, type StreamInfo } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

let innertube: Promise<Innertube> | null = null;

function getClient(): Promise<Innertube> {
  if (!innertube) {
    innertube = Innertube.create({
      retrieve_player: true,
      generate_session_locally: true,
    }).catch((e: unknown) => {
      innertube = null;
      throw new CatalogError('Não foi possível iniciar o cliente do catálogo.', 'network');
    });
  }
  return innertube;
}

const text = (v: any): string => (typeof v === 'string' ? v : v?.text ?? v?.toString?.() ?? '');

function fromMusicItem(item: any): Track | null {
  const id: string | undefined = item?.id ?? item?.video_id;
  if (!id || (item.item_type && item.item_type !== 'song' && item.item_type !== 'video')) return null;
  const artists: string[] = (item.artists ?? []).map((a: any) => a.name).filter(Boolean);
  return makeTrack({
    sourceId: id,
    title: text(item.title),
    artist: artists.join(', ') || item.author?.name || text(item.author),
    album: item.album?.name ?? null,
    durationSec: item.duration?.seconds ?? null,
  });
}

function fromPanelVideo(item: any): Track | null {
  if (!item?.video_id) return null;
  return makeTrack({
    sourceId: item.video_id,
    title: text(item.title),
    artist: (item.artists ?? []).map((a: any) => a.name).join(', ') || item.author,
    album: item.album?.name ?? null,
    durationSec: item.duration?.seconds ?? null,
  });
}

// Clientes tentados em ordem: alguns retornam URL direta sem precisar de PO token.
const STREAM_CLIENTS = ['ANDROID', 'IOS', 'TV'] as const;

export const youtubeCatalog: CatalogProvider = {
  async search(query) {
    const q = query.trim();
    if (!q) return [];
    const yt = await getClient();
    try {
      const res: any = await yt.music.search(q, { type: 'song' });
      const items: any[] = res.songs?.contents ?? res.contents?.flatMap((s: any) => s.contents ?? []) ?? [];
      const tracks = items.map(fromMusicItem).filter((t): t is Track => t !== null);
      return dedupe(tracks);
    } catch (e) {
      throw new CatalogError('Falha ao buscar músicas. Verifique sua conexão.', 'network');
    }
  },

  async suggestions(query) {
    const q = query.trim();
    if (!q) return [];
    try {
      const yt = await getClient();
      const sections: any[] = await yt.music.getSearchSuggestions(q);
      return sections
        .flatMap((s) => s.contents ?? [])
        .map((c: any) => text(c.suggestion))
        .filter(Boolean)
        .slice(0, 8);
    } catch {
      return []; // sugestões são opcionais
    }
  },

  async getStream(track): Promise<StreamInfo> {
    const yt = await getClient();
    let lastError: unknown;
    for (const client of STREAM_CLIENTS) {
      try {
        const format: any = await yt.getStreamingData(track.sourceId, {
          type: 'audio',
          quality: 'best',
          format: 'any',
          client,
        } as any);
        if (!format?.url) continue;
        const expire = Number(new URL(format.url).searchParams.get('expire'));
        return {
          url: format.url,
          mimeType: format.mime_type ?? null,
          expiresAt: Number.isFinite(expire) && expire > 0 ? expire * 1000 : null,
        };
      } catch (e) {
        lastError = e;
      }
    }
    throw new CatalogError(
      `Não foi possível obter o áudio de "${track.title}".` + (lastError instanceof Error ? ` (${lastError.message})` : ''),
      'unavailable',
    );
  },

  async getRelated(track) {
    try {
      const yt = await getClient();
      const panel: any = await yt.music.getUpNext(track.sourceId, true);
      const tracks = (panel.contents ?? []).map(fromPanelVideo).filter((t: Track | null): t is Track => t !== null);
      return dedupe(tracks).filter((t) => t.id !== track.id);
    } catch {
      return [];
    }
  },
};

function dedupe(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
}
