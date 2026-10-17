// Importa o build para React Native do youtubei.js.
import { Innertube } from 'youtubei.js/react-native';
import type { Track } from '@/types';
import { makeTrack } from '@/utils/track';
import {
  CatalogError,
  type ArtistCollectionItem,
  type CatalogCollection,
  type ArtistProfile,
  type CatalogArtist,
  type CatalogProvider,
  type StreamInfo,
} from './types';
import { getStreamServerUrl } from './server';
import { getDb, settingsRepo } from '@/database';
import { t } from '@/i18n';

/* eslint-disable @typescript-eslint/no-explicit-any */

let innertube: Promise<Innertube> | null = null;

function getClient(): Promise<Innertube> {
  if (!innertube) {
    innertube = Innertube.create({
      retrieve_player: true,
      generate_session_locally: true,
    }).catch((e: unknown) => {
      innertube = null;
      throw new CatalogError(t('catalog.clientFailed'), 'network');
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

function artistId(item: any): string | undefined {
  return item?.id
    ?? item?.channel_id
    ?? item?.author?.channel_id
    ?? item?.artists?.[0]?.channel_id
    ?? item?.endpoint?.payload?.browseId;
}

function fromArtistResult(item: any): CatalogArtist | null {
  const id = artistId(item);
  const name = text(item?.title ?? item?.name ?? item?.author?.name ?? item?.artists?.[0]?.name);
  if (!id || !name) return null;
  const thumbnails = item?.thumbnails ?? item?.thumbnail?.contents ?? item?.thumbnail ?? [];
  return {
    id,
    name,
    subtitle: text(item?.subtitle ?? item?.subscribers ?? item?.description),
    imageUrl: thumbnails[thumbnails.length - 1]?.url ?? null,
  };
}

function fromArtistCollectionItem(
  item: any,
  kind: ArtistCollectionItem['kind'],
): ArtistCollectionItem | null {
  const track = fromMusicItem(item);
  const id = item?.id ?? item?.endpoint?.payload?.browseId;
  const title = text(item?.title ?? item?.name ?? track?.title);
  if (!id || !title) return null;
  const thumbnails = item?.thumbnails ?? item?.thumbnail ?? [];
  return {
    id,
    title,
    subtitle: text(item?.subtitle ?? item?.year ?? item?.item_count),
    imageUrl: thumbnails[thumbnails.length - 1]?.url ?? null,
    kind: track ? 'track' : kind,
    ...(track ? { track } : {}),
  };
}

function artistDescription(value: unknown): string {
  return text(value).split(/\r?\n/)
    .map((line) => line.replace(/(?:\s*[|·—-]\s*)?(?:source|fonte)\s*:.*$/i, '').trim())
    .map((line) => line.replace(/https?:\/\/(?:www\.)?(?:music\.)?youtube\.com\S*/ig, '').trim())
    .filter(Boolean)
    .join('\n')
}

function sectionTitle(section: any): string {
  return text(section?.title ?? section?.header?.title)
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

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
      throw new CatalogError(t('catalog.searchFailed'), 'network');
    }
  },

  async searchArtists(query) {
    const q = query.trim();
    if (!q) return [];
    const yt = await getClient();
    try {
      const res: any = await yt.music.search(q, { type: 'artist' });
      const items: any[] = res.artists?.contents ?? [];
      const seen = new Set<string>();
      return items
        .map(fromArtistResult)
        .filter((artist): artist is CatalogArtist => {
          if (!artist || seen.has(artist.id)) return false;
          seen.add(artist.id);
          return true;
        });
    } catch {
      throw new CatalogError(t('artist.searchFailed'), 'network');
    }
  },

  async getArtist(id): Promise<ArtistProfile> {
    if (!id.trim()) throw new CatalogError(t('artist.notFound'), 'parse');
    const yt = await getClient();
    try {
      const page = await yt.music.getArtist(id);
      const sections: any[] = page.sections;
      const header: any = page.header;
      const name = text(header?.title) || t('artist.unknown');
      const thumbnails = header?.thumbnail?.contents ?? header?.thumbnail ?? [];
      const artist: CatalogArtist = {
        id,
        name,
        subtitle: '',
        imageUrl: thumbnails[thumbnails.length - 1]?.url ?? thumbnails[0]?.url ?? null,
      };
      const topSongs = sections.find((section) =>
        /top songs|top tracks|popular songs|mais ouvidas|musicas populares|principais musicas/.test(sectionTitle(section)),
      );
      const trackSections = topSongs
        ? [topSongs]
        : sections.filter((section) =>
          (section.contents ?? []).some((item: any) => item?.item_type === 'song' || item?.item_type === 'video'),
        );
      const initialTracks = trackSections
        .flatMap((section) => section.contents ?? [])
        .map((item: any) => fromMusicItem(item))
        .filter((track: Track | null): track is Track => track !== null);
      let allTracks: Track[] | undefined;
      if (topSongs && sectionTitle(topSongs).includes('top songs')) {
        try {
          const allSongsPage = await page.getAllSongs();
          allTracks = allSongsPage?.contents
            ?.map((item: any) => fromMusicItem(item))
            .filter((track: Track | null): track is Track => track !== null);
        } catch (error) {
          console.warn('Could not load the complete artist song list.', error);
        }
      }
      const tracks = dedupe(allTracks?.length ? allTracks : initialTracks);

      const albums: ArtistCollectionItem[] = [];
      const singles: ArtistCollectionItem[] = [];
      const eps: ArtistCollectionItem[] = [];
      const playlists: ArtistCollectionItem[] = [];
      const relatedArtists: CatalogArtist[] = [];
      for (const section of sections) {
        const title = sectionTitle(section);
        for (const item of section.contents ?? []) {
          const itemType = text(item?.item_type ?? item?.endpoint?.payload?.endpointType).toLocaleLowerCase();
          const isRelatedArtist = itemType.includes('artist')
            || /related artists|similar artists|fans also like|artists like|artistas relacionados|artistas similares|fas tambem gostam/.test(title);
          const isPlaylist = itemType.includes('playlist') || /playlists?/.test(title);
          if (isRelatedArtist) {
            const artistResult = fromArtistResult(item);
            if (artistResult) relatedArtists.push(artistResult);
          } else if (isPlaylist) {
            const collectionItem = fromArtistCollectionItem(item, 'playlist');
            if (collectionItem) playlists.push(collectionItem);
          } else if (/eps?|extended plays?/.test(title) && !/singles?/.test(title)) {
            const collectionItem = fromArtistCollectionItem(item, 'ep');
            if (collectionItem) eps.push(collectionItem);
          } else if (/singles?/.test(title)) {
            const itemTitle = text(item?.title ?? item?.name);
            const itemKind = /(?:^|\W)ep(?:\W|$)/i.test(`${itemTitle} ${text(item?.subtitle)}`) ? 'ep' : 'single';
            const collectionItem = fromArtistCollectionItem(item, itemKind);
            if (collectionItem) (itemKind === 'ep' ? eps : singles).push(collectionItem);
          } else if (/albums?/.test(title) || itemType.includes('album')) {
            const collectionItem = fromArtistCollectionItem(item, 'album');
            if (collectionItem) albums.push(collectionItem);
          }
        }
      }
      return {
        ...artist,
        description: artistDescription(header?.description),
        tracks,
        albums: dedupeCollection(albums),
        singles: dedupeCollection(singles),
        eps: dedupeCollection(eps),
        playlists: dedupeCollection(playlists),
        relatedArtists: dedupeArtists(relatedArtists),
      };
    } catch (e) {
      if (e instanceof CatalogError) throw e;
      throw new CatalogError(t('artist.loadFailed'), 'network');
    }
  },

  async getCollection(id, kind): Promise<CatalogCollection> {
    if (!id.trim()) throw new CatalogError(t('artist.notFound'), 'parse');
    const yt = await getClient();
    try {
      let page: any = kind === 'album'
        ? await yt.music.getAlbum(id)
        : await yt.music.getPlaylist(id);
      const header = page.header;
      const title = text(header?.title ?? header?.title?.text) || t('artist.collection');
      const thumbnails = header?.thumbnail?.contents ?? header?.thumbnail ?? [];
      const imageUrl = thumbnails[thumbnails.length - 1]?.url ?? thumbnails[0]?.url ?? null;
      const tracks: Track[] = [];

      while (page) {
        const contents: any[] = kind === 'album'
          ? page.contents ?? []
          : page.items ?? page.contents ?? [];
        tracks.push(...contents.map((item) => fromMusicItem(item) ?? fromPanelVideo(item)).filter((track): track is Track => track !== null));
        if (kind !== 'playlist' || !page.has_continuation) break;
        page = await page.getContinuation();
      }

      return {
        title,
        subtitle: text(header?.subtitle ?? header?.strapline ?? ''),
        imageUrl,
        tracks: dedupe(tracks),
      };
    } catch (e) {
      if (e instanceof CatalogError) throw e;
      throw new CatalogError(t('artist.collectionLoadFailed'), 'network');
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
    if (!/^[\w-]{11}$/.test(track.sourceId)) {
      throw new CatalogError(t('catalog.invalidTrackId'), 'parse');
    }
    const settings = await settingsRepo.loadSettings(await getDb());
    const baseUrl = getStreamServerUrl(settings);
    return {
      url: `${baseUrl}/stream/${encodeURIComponent(track.sourceId)}?profile=${settings.playbackMode}`,
      mimeType: null,
      expiresAt: null,
    };
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

function dedupeCollection(items: ArtistCollectionItem[]): ArtistCollectionItem[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

function dedupeArtists(items: CatalogArtist[]): CatalogArtist[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

/** Lê uma playlist pública do YouTube Music (até 500 faixas, seguindo continuações). */
export async function getPublicMusicPlaylist(playlistId: string): Promise<{
  name: string;
  tracks: Track[];
  truncated: boolean;
}> {
  const yt = await getClient();
  try {
    let page: any = await yt.music.getPlaylist(playlistId);
    const name = text(page.header?.title) || t('catalog.playlistFallback');
    const tracks: Track[] = [];
    const seen = new Set<string>();
    const maxTracks = 500;

    while (true) {
      for (const item of page.items ?? []) {
        const track = fromMusicItem(item);
        if (track && !seen.has(track.id)) {
          tracks.push(track);
          seen.add(track.id);
          if (tracks.length >= maxTracks) break;
        }
      }
      if (!page.has_continuation || tracks.length >= maxTracks) break;
      page = await page.getContinuation();
    }

    if (!tracks.length) throw new CatalogError(t('catalog.noPlaylistTracks'), 'unavailable');
    return { name, tracks, truncated: tracks.length >= maxTracks && !!page.has_continuation };
  } catch (e) {
    if (e instanceof CatalogError) throw e;
    throw new CatalogError(t('catalog.loadPlaylistError'), 'network');
  }
}
