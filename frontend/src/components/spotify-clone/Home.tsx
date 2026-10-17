import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components';
import { useFavorites, useHistory } from '@/features/library/useLibrary';
import { usePlaylists } from '@/features/playlists/usePlaylists';
import { catalog } from '@/services/catalog';
import type { CatalogArtist } from '@/services/catalog/types';
import type { Track } from '@/types';
import { GENRES } from '@/features/search/genres';
import { t, useTranslation } from '@/i18n';
import { playQueue } from '@/services/audio/controller';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Slider } from './Slider';
import type { CardItem } from './Card';
import { BrowseCategory, GENRE_PLACEHOLDERS } from './BrowseCategory';
import { ArtworkImage } from '../ArtworkImage';
import { useStartupStore } from '@/services/startup';

const GENRE_COLORS = ['#248fcf', '#7811b3', '#a1727e', '#6eaf78', '#58428b', '#21b47a', '#8158e6', '#db6953'];

const ARTIST_LOOKUP_LIMIT = 4;

export function Home({ onReady }: { onReady?: (ready: boolean) => void }) {
  useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const history = useHistory(30);
  const favorites = useFavorites();
  const playlists = usePlaylists();
  const hasLoadedHome = useStartupStore((state) => state.hasLoadedHome);
  const tracks = useMemo(() => history.data.map(({ track }) => track), [history.data]);
  const recentItems = tracks.slice(0, 8);
  const artistNames = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const track of [...tracks, ...favorites.data]) {
      for (const artist of track.artist.split(',').map((name) => name.trim()).filter(Boolean)) {
        const key = artist.toLocaleLowerCase();
        const previous = counts.get(key);
        counts.set(key, { name: previous?.name ?? artist, count: (previous?.count ?? 0) + 1 });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [favorites.data, tracks]);
  const [topArtists, setTopArtists] = useState<CatalogArtist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [artistsError, setArtistsError] = useState<string | null>(null);
  const [artistsRetry, setArtistsRetry] = useState(0);
  const [recommended, setRecommended] = useState<Track[]>([]);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const homeReady = !history.loading && !favorites.loading && !playlists.loading;

  useEffect(() => {
    if (history.loading || favorites.loading) return;
    if (!artistNames.length) {
      setTopArtists([]);
      setArtistsError(null);
      setArtistsLoading(false);
      return;
    }

    let active = true;
    setArtistsLoading(true);
    setArtistsError(null);
    const artistMatches: (CatalogArtist | undefined)[] = [];
    let hadArtistFailure = false;
    const lookups = artistNames.slice(0, ARTIST_LOOKUP_LIMIT).map(async ({ name }, index) => {
      let match: CatalogArtist = { id: 'search', name, subtitle: '', imageUrl: null };
      try {
        const results = await catalog.searchArtists(name);
        const query = name.toLocaleLowerCase();
        match = results.find((candidate) => candidate.name.toLocaleLowerCase() === query)
          ?? results[0]
          ?? match;
      } catch (error) {
        hadArtistFailure = true;
        console.warn(`[home] Could not find artist "${name}"`, error);
      }
      if (!active) return;
      artistMatches[index] = match;
      const seen = new Set<string>();
      setTopArtists(artistMatches.filter((artist): artist is CatalogArtist => artist !== undefined).filter((artist) => {
        const key = artist.id === 'search' ? artist.name.toLocaleLowerCase() : artist.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }));
    });
    void Promise.all(lookups)
      .then(() => {
        if (active) setArtistsError(hadArtistFailure ? t('artist.searchFailed') : null);
      })
      .finally(() => {
        if (active) {
          setArtistsLoading(false);
        }
      });

    return () => { active = false; };
  }, [artistNames, artistsRetry, favorites.loading, history.loading]);

  useEffect(() => {
    let current = true;
    if (history.loading) return () => { current = false; };
    setRecommendationError(null);
    const listened = new Set(history.data.map(({ track }) => track.id));
    const seeds = history.data.slice(0, 2).map(({ track }) => track);
    if (!seeds.length) {
      setRecommended([]);
      setRecommendationError(null);
      return () => { current = false; };
    }

    const suggestions = new Map<string, Track>();
    const lookups = seeds.map(async (track) => {
      try {
        const related = await catalog.getRelated(track);
        if (!current) return;
        for (const suggestion of related) {
          if (!listened.has(suggestion.id)) suggestions.set(suggestion.id, suggestion);
        }
        setRecommended([...suggestions.values()].slice(0, 12));
      } catch (error) {
        console.warn('[home] Could not load related tracks', error);
        if (current && !suggestions.size) setRecommendationError(t('home.recommendationsFailed'));
      }
    });
    void Promise.all(lookups);

    return () => { current = false; };
  }, [history.data, history.loading]);

  useEffect(() => {
    onReady?.(homeReady);
  }, [homeReady, onReady]);

  const favoriteCards: CardItem[] = favorites.data.slice(0, 12).map((track, index) => ({
    id: `favorite-${track.id}`,
    title: track.title,
    subtitle: track.artist,
    imageUrl: track.artworkUrl,
    onPress: () => playQueue(favorites.data, index),
  }));
  const playlistCards: CardItem[] = playlists.data.slice(0, 12).map((playlist) => ({
    id: `playlist-${playlist.id}`,
    title: playlist.name,
    subtitle: t('common.tracks', { count: playlist.trackCount }),
    imageUrl: playlist.coverUrl ?? undefined,
    onPress: () => router.push({ pathname: '/playlist/[id]', params: { id: String(playlist.id) } }),
  }));
  const recentCards: CardItem[] = tracks.slice(0, 12).map((track, index) => ({
    id: `recent-${track.id}-${index}`,
    title: track.title,
    subtitle: track.artist,
    imageUrl: track.artworkUrl,
    onPress: () => playQueue(tracks, index),
  }));
  const artistCards: CardItem[] = topArtists.map((artist) => ({
    id: artist.id,
    title: artist.name,
    subtitle: artist.subtitle || undefined,
    imageUrl: artist.imageUrl ?? undefined,
    onPress: () => router.push({ pathname: '/artist/[id]', params: { id: artist.id, name: artist.name } }),
  }));
  const recommendedCards: CardItem[] = recommended.map((track, index) => ({
    id: `recommended-${track.id}`,
    title: track.title,
    subtitle: track.artist,
    imageUrl: track.artworkUrl,
    onPress: () => playQueue(recommended, index),
  }));

  if (!homeReady && !hasLoadedHome) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={s.loadingText}>{t('app.starting')}</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.recentGrid}>
          {recentItems.map((track, index) => (
            <Pressable
              key={`${track.id}-${index}`}
              accessibilityRole="button"
              onPress={() => playQueue(tracks, index)}
              style={({ pressed }) => [s.recentTile, { width: width / 2 - 20 }, pressed && s.pressed]}
            >
              <ArtworkImage uri={track.artworkUrl} style={s.recentCover} />
              <Text numberOfLines={2} style={s.recentTitle}>{track.title}</Text>
            </Pressable>
          ))}
        </View>

        {recentCards.length ? (
          <Slider
            title={t('home.recent')}
            items={recentCards}
            onShowAll={() => router.push('/recent')}
            showAllLabel={t('common.seeMore')}
          />
        ) : null}
        {recommendedCards.length ? (
          <Slider title={t('home.recommended')} items={recommendedCards} />
        ) : null}
        {recommendationError ? <Text style={s.recommendationError}>{recommendationError}</Text> : null}
        {artistNames.length ? (
          <View>
            {artistCards.length ? (
              <Slider title={t('home.topArtists')} items={artistCards} size={104} shape="circle" />
            ) : artistsLoading ? (
              <EmptyState loading message={t('common.loading')} />
            ) : null}
            {artistsError ? (
              <View style={s.artistError}>
                <Text style={s.artistErrorText}>{artistsError}</Text>
                <Pressable accessibilityRole="button" onPress={() => setArtistsRetry((value) => value + 1)}>
                  <Text style={s.artistRetry}>{t('common.retry')}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
        {favoriteCards.length ? (
          <Slider title={t('library.tab.liked')} items={favoriteCards} onShowAll={() => router.push('/library')} showAllLabel={t('common.seeAll')} />
        ) : null}
        {playlistCards.length ? (
          <Slider title={t('home.playlists')} items={playlistCards} onShowAll={() => router.push('/playlists')} showAllLabel={t('common.seeAll')} />
        ) : tracks.length || favoriteCards.length ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/playlists')} style={s.createPlaylist}>
            <Text style={s.createGlyph}>＋</Text>
            <View style={s.createCopy}>
              <Text style={s.createTitle}>{t('library.newPlaylist')}</Text>
              <Text style={s.createHint}>{t('library.emptyPlaylists')}</Text>
            </View>
          </Pressable>
        ) : null}

        {!tracks.length && !favoriteCards.length ? (
          <View style={s.discovery}>
            <Text style={s.sectionTitle}>{t('home.discoverGenres')}</Text>
            <Text style={s.discoveryHint}>{t('home.discoverGenresHint')}</Text>
            <View style={s.genreGrid}>
              {GENRES.map((genre, index) => {
                const title = t(genre.key);
                return (
                  <BrowseCategory
                    key={genre.key}
                    title={title}
                    color={GENRE_COLORS[index % GENRE_COLORS.length]}
                    imageSource={GENRE_PLACEHOLDERS[genre.key]}
                    onPress={() => router.push({ pathname: '/search', params: { genre: title } })}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.bg },
  loadingText: { color: colors.textMuted, fontSize: font.md },
  scroll: { paddingVertical: spacing.md, paddingBottom: spacing.xl },
  recentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  recentTile: { height: 56, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  recentCover: { width: 56, height: 56, backgroundColor: colors.surface },
  recentTitle: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 16, fontWeight: '700', paddingHorizontal: spacing.sm },
  seeMore: { alignSelf: 'flex-end', marginHorizontal: spacing.md, marginTop: -spacing.sm, marginBottom: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  seeMoreLabel: { color: colors.textMuted, fontSize: font.sm, fontWeight: '700' },
  recommendationError: { color: colors.textMuted, fontSize: font.sm, marginHorizontal: spacing.md, marginBottom: spacing.md },
  artistError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  artistErrorText: { flex: 1, color: colors.danger, fontSize: font.sm },
  artistRetry: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
  createPlaylist: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm },
  createGlyph: { color: colors.text, fontSize: 28 },
  createCopy: { flex: 1, gap: spacing.xs },
  createTitle: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  createHint: { color: colors.textMuted, fontSize: font.sm },
  discovery: { marginTop: spacing.md },
  discoveryHint: { color: colors.textMuted, fontSize: font.sm, paddingHorizontal: spacing.md, marginTop: spacing.xs },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  pressed: { opacity: 0.78 },
});
