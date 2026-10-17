import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../EmptyState';
import { IconButton } from '../IconButton';
import { ImportPlaylistModal } from '../ImportPlaylistModal';
import { TrackActionsModal } from '../TrackActionsModal';
import { useFavorites, useHistory } from '@/features/library/useLibrary';
import { usePlaylists } from '@/features/playlists/usePlaylists';
import { t } from '@/i18n';
import { playQueue } from '@/services/audio/controller';
import type { Track } from '@/types';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Card } from './Card';
import { Header } from './Header';
import { LibraryRelated, type LibraryCategory } from './LibraryRelated';
import type { CardItem } from './Card';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';

export function Library() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState<LibraryCategory>('favorites');
  const favorites = useFavorites();
  const history = useHistory(200);
  const playlists = usePlaylists();
  const current = usePlayerStore(selectCurrentTrack);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [importing, setImporting] = useState(false);
  const isPlaylist = category === 'playlists';
  const tracks = category === 'favorites' ? favorites.data : history.data.map(({ track }) => track);

  const cards: CardItem[] = isPlaylist
    ? playlists.data.map((playlist) => ({
        id: `playlist-${playlist.id}`,
        title: playlist.name,
        subtitle: t('common.tracks', { count: playlist.trackCount }),
        imageUrl: playlist.coverUrl ?? undefined,
        onPress: () => router.push({ pathname: '/playlist/[id]', params: { id: String(playlist.id) } }),
      }))
    : tracks.map((track, index) => ({
        id: `${track.id}-${index}`,
        title: track.title,
        subtitle: track.artist,
        imageUrl: track.artworkUrl,
        active: track.id === current?.id,
        onPress: () => playQueue(tracks, index),
        onMore: () => setMenuTrack(track),
        moreLabel: t('common.more'),
      }));

  const loading = isPlaylist ? playlists.loading : category === 'favorites' ? favorites.loading : history.loading;

  return (
    <View style={s.container}>
      <Header
        title={t('tabs.library')}
        right={(
          <>
            <IconButton icon="cloud-download-outline" size={24} label={t('import.action')} onPress={() => setImporting(true)} />
            <IconButton icon="add" size={28} label={t('library.newPlaylist')} onPress={() => router.push('/playlists')} />
          </>
        )}
        related={(
          <LibraryRelated
            value={category}
            onChange={setCategory}
            labels={{
              favorites: t('library.tab.liked'),
              history: t('library.tab.history'),
              playlists: t('library.tab.playlists'),
            }}
          />
        )}
      />
      <View style={s.heading}>
        <Text style={s.title}>
          {isPlaylist ? t('library.tab.playlists') : category === 'favorites' ? t('library.tab.liked') : t('library.tab.history')}
        </Text>
        {!isPlaylist && tracks.length ? (
          <Pressable accessibilityRole="button" onPress={() => playQueue(tracks, 0)} style={s.playButton}>
            <Text style={s.playLabel}>▶ {t('library.playAll')}</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        key={category}
        data={cards}
        numColumns={3}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card item={item} size={(width - spacing.md * 2 - spacing.md * 2) / 3} />
        )}
        contentContainerStyle={s.grid}
        columnWrapperStyle={s.columns}
        ListEmptyComponent={<EmptyState loading={loading} message={loading ? t('common.loading') : isPlaylist ? t('library.emptyPlaylists') : category === 'favorites' ? t('library.emptyLiked') : t('library.emptyHistory')} />}
        showsVerticalScrollIndicator={false}
      />
      <ImportPlaylistModal
        visible={importing}
        onClose={() => setImporting(false)}
        onImported={(id) => {
          setImporting(false);
          void playlists.reload();
          router.push({ pathname: '/playlist/[id]', params: { id: String(id) } });
        }}
      />
      <TrackActionsModal track={menuTrack} onClose={() => { setMenuTrack(null); void favorites.reload(); }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.md },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  grid: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  columns: { justifyContent: 'space-between' },
  playButton: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  playLabel: { color: colors.accentText, fontSize: font.sm, fontWeight: '800' },
});
