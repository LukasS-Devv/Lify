import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '../EmptyState';
import { IconButton } from '../IconButton';
import { TrackActionsModal } from '../TrackActionsModal';
import { TrackRow } from '../TrackRow';
import { useSearch } from '@/features/search/useSearch';
import { t } from '@/i18n';
import { playQueue } from '@/services/audio/controller';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';
import type { Track } from '@/types';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { BrowseCategory, GENRE_PLACEHOLDERS } from './BrowseCategory';
import { ArtworkImage } from '../ArtworkImage';
import type { TKey } from '@/i18n';

const CATEGORY_COLORS = ['#248fcf', '#7811b3', '#a1727e', '#6eaf78', '#58428b', '#21b47a', '#8158e6', '#db6953'];

export function Search() {
  const { genre } = useLocalSearchParams<{ genre?: string }>();
  const router = useRouter();
  const { query, setQuery, results, artists, artistError, suggestions, loading, error, searched, submit, clear } = useSearch();
  const current = usePlayerStore(selectCurrentTrack);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const lastRouteGenre = useRef<string | null>(null);
  const categories: { key: TKey; title: string }[] = [
    { key: 'genre.pop', title: t('genre.pop') },
    { key: 'genre.rock', title: t('genre.rock') },
    { key: 'genre.hiphop', title: t('genre.hiphop') },
    { key: 'genre.electronic', title: t('genre.electronic') },
    { key: 'genre.jazz', title: t('genre.jazz') },
    { key: 'genre.classical', title: t('genre.classical') },
    { key: 'genre.jpop', title: t('genre.jpop') },
    { key: 'genre.mpb', title: t('genre.mpb') },
  ];
  const browse = !searched && query.trim().length === 0 && suggestions.length === 0;

  useEffect(() => {
    const selectedGenre = typeof genre === 'string' ? genre.trim() : '';
    if (!selectedGenre) {
      lastRouteGenre.current = null;
      return;
    }
    if (lastRouteGenre.current === selectedGenre) return;

    lastRouteGenre.current = selectedGenre;
    void submit(selectedGenre);
    router.setParams({ genre: undefined });
  }, [genre, router, submit]);

  return (
    <View style={s.container}>
      <View style={s.searchBox}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => {
            Keyboard.dismiss();
            void submit();
          }}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          style={s.input}
        />
        {query ? (
          <IconButton icon="close-circle" size={20} color={colors.textMuted} label={t('search.clear')} onPress={clear} />
        ) : null}
      </View>

      {suggestions.length && !searched ? (
        <View style={s.suggestions}>
          {suggestions.map((suggestion) => (
            <Pressable key={suggestion} onPress={() => {
              Keyboard.dismiss();
              void submit(suggestion);
            }} style={s.suggestion}>
              <Text style={s.suggestionIcon}>⌕</Text>
              <Text numberOfLines={1} style={s.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      ) : browse ? (
        <FlatList
          key="browse"
          data={categories}
          numColumns={2}
          keyExtractor={(item) => item.key}
          renderItem={({ item, index }) => (
            <BrowseCategory
              title={item.title}
              color={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
              imageSource={GENRE_PLACEHOLDERS[item.key]}
              onPress={() => submit(item.title)}
            />
          )}
          contentContainerStyle={s.browseContent}
          columnWrapperStyle={s.columns}
          ListHeaderComponent={<Text style={s.browseTitle}>{t('search.browse')}</Text>}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          key="results"
          data={results}
          keyExtractor={(track) => track.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TrackRow
              track={item}
              active={item.id === current?.id}
              onPress={() => playQueue(results, index)}
              onMore={() => setMenuTrack(item)}
            />
          )}
          ListHeaderComponent={searched && query.trim() ? (
            <View>
              <Text style={s.resultsTitle}>{t('search.resultsFor', { query: query.trim() })}</Text>
              {artists.length ? (
                <View style={s.artistResults}>
                  <Text style={s.artistHeading}>{t('artist.searchResults')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.artistItems}>
                    {artists.map((artist) => (
                      <Pressable
                        key={artist.id}
                        accessibilityRole="button"
                        onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id } })}
                        style={({ pressed }) => [s.artistItem, pressed && { opacity: 0.75 }]}
                      >
                        {artist.imageUrl
                          ? <View style={s.artistImageWrap}><ArtworkImage uri={artist.imageUrl} style={s.artistImage} /></View>
                          : <View style={[s.artistImage, s.artistPlaceholder]}><Text style={s.artistGlyph}>♫</Text></View>}
                        <Text numberOfLines={1} style={s.artistName}>{artist.name}</Text>
                        <Text numberOfLines={1} style={s.artistSubtitle}>{artist.subtitle || t('artist.profile')}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : artistError ? <Text style={s.artistError}>{artistError}</Text> : null}
            </View>
          ) : null}
          ListEmptyComponent={
            loading ? <EmptyState loading message={t('search.searching')} />
              : artists.length ? <EmptyState message={t('artist.noSongs')} />
              : error ? <EmptyState message={error} actionLabel={t('common.retry')} onAction={() => submit()} />
              : <EmptyState message={searched ? t('search.noResults', { query: query.trim() }) : t('search.startTyping')} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
      <TrackActionsModal track={menuTrack} onClose={() => setMenuTrack(null)} showIcons={false} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBox: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md, paddingHorizontal: spacing.md, backgroundColor: colors.text, borderRadius: radius.sm },
  searchIcon: { color: colors.bg, fontSize: 26, lineHeight: 28 },
  input: { flex: 1, color: colors.bg, fontSize: font.md, paddingVertical: spacing.sm },
  suggestions: { paddingHorizontal: spacing.md },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceAlt },
  suggestionIcon: { color: colors.textMuted, fontSize: 22 },
  suggestionText: { color: colors.text, flex: 1, fontSize: font.md },
  browseContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  columns: { alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  browseTitle: { color: colors.text, fontSize: 16, lineHeight: 18, fontWeight: '700', marginBottom: spacing.sm },
  resultsTitle: { color: colors.text, fontSize: font.lg, fontWeight: '700', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  artistResults: { marginBottom: spacing.md },
  artistHeading: { color: colors.text, fontSize: font.md, fontWeight: '700', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  artistItems: { gap: spacing.md, paddingHorizontal: spacing.md },
  artistItem: { width: 112, alignItems: 'center', gap: spacing.xs },
  artistImage: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceAlt },
  artistImageWrap: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden' },
  artistPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  artistGlyph: { color: colors.textMuted, fontSize: 40 },
  artistName: { width: '100%', color: colors.text, fontSize: font.sm, fontWeight: '700', textAlign: 'center' },
  artistSubtitle: { width: '100%', color: colors.textMuted, fontSize: font.xs, textAlign: 'center' },
  artistError: { color: colors.textMuted, fontSize: font.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
});
