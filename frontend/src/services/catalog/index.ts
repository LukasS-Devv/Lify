import { youtubeCatalog } from './youtube';
import { cachedCatalogRequest } from './cache';
import type { CatalogProvider } from './types';

export * from './types';

const SEARCH_TTL = 20 * 60 * 1000;
const ARTIST_SEARCH_TTL = 24 * 60 * 60 * 1000;
const CATALOG_TTL = 7 * 24 * 60 * 60 * 1000;
const RELATED_TTL = 24 * 60 * 60 * 1000;

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export const catalog: CatalogProvider = {
  search(query) {
    const normalized = normalizeQuery(query);
    return cachedCatalogRequest(`search:${normalized}`, SEARCH_TTL, () => youtubeCatalog.search(query));
  },
  searchArtists(query) {
    const normalized = normalizeQuery(query);
    return cachedCatalogRequest(`artist-search:${normalized}`, ARTIST_SEARCH_TTL, () => youtubeCatalog.searchArtists(query));
  },
  getArtist(id) {
    return cachedCatalogRequest(`artist:${id}`, CATALOG_TTL, () => youtubeCatalog.getArtist(id));
  },
  getCollection(id, kind) {
    return cachedCatalogRequest(`collection:${kind}:${id}`, CATALOG_TTL, () => youtubeCatalog.getCollection(id, kind));
  },
  suggestions(query) {
    return youtubeCatalog.suggestions(query);
  },
  getStream(track) {
    return youtubeCatalog.getStream(track);
  },
  prefetch(track) {
    return youtubeCatalog.prefetch(track);
  },
  getRelated(track) {
    return cachedCatalogRequest(`related:${track.sourceId}`, RELATED_TTL, () => youtubeCatalog.getRelated(track));
  },
};
