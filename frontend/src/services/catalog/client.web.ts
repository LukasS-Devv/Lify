import type { CatalogClient } from './client';
import { getDb, settingsRepo } from '@/database';
import { getStreamServerUrl } from './server';

async function requestCatalog<T>(path: string): Promise<T> {
  const settings = await settingsRepo.loadSettings(await getDb());
  const response = await fetch(`${getStreamServerUrl(settings)}/catalog/${path}`);
  if (!response.ok) throw new Error(`Catalog request failed with status ${response.status}`);
  return response.json();
}

function continuationPage() {
  return {
    contents: [],
    items: [],
    has_continuation: false,
    getContinuation: async () => continuationPage(),
  };
}

export async function createCatalogClient(): Promise<CatalogClient> {
  return {
    music: {
      async search(query, { type }) {
        const items = await requestCatalog<any[]>(
          `search?q=${encodeURIComponent(query)}&type=${type}`,
        );
        return type === 'artist' ? { artists: { contents: items } } : { songs: { contents: items } };
      },
      async getArtist(id) {
        const result = await requestCatalog<{ header: any; sections: any[]; allSongs: any[] }>(
          `artist/${encodeURIComponent(id)}`,
        );
        return {
          header: result.header,
          sections: result.sections,
          getAllSongs: async () => ({ contents: result.allSongs }),
        };
      },
      async getAlbum(id) {
        const result = await requestCatalog<{ header: any; contents: any[]; hasMore: boolean }>(
          `collection/album/${encodeURIComponent(id)}`,
        );
        return {
          header: result.header,
          contents: result.contents,
          has_continuation: result.hasMore,
          getContinuation: async () => continuationPage(),
        };
      },
      async getPlaylist(id) {
        const result = await requestCatalog<{
          header: any;
          contents: any[];
          items: any[];
          hasMore: boolean;
        }>(`collection/playlist/${encodeURIComponent(id)}`);
        return {
          header: result.header,
          contents: result.contents,
          items: result.items,
          has_continuation: result.hasMore,
          getContinuation: async () => continuationPage(),
        };
      },
      async getSearchSuggestions(query) {
        return requestCatalog<any[]>(`suggestions?q=${encodeURIComponent(query)}`);
      },
      async getUpNext(videoId) {
        const contents = await requestCatalog<any[]>(`related/${encodeURIComponent(videoId)}`);
        return { contents };
      },
    },
  };
}
