import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../EmptyState';
import { IconButton } from '../IconButton';
import { ImportPlaylistModal } from '../ImportPlaylistModal';
import { ActionSheet } from '../ActionSheet';
import { Icon } from '../Icon';
import { TrackActionsModal } from '../TrackActionsModal';
import { ArtworkImage } from '../ArtworkImage';
import { Cover, MosaicCover } from '../Cover';
import { TrackRow } from '../TrackRow';
import { useFavorites, useHistory } from '@/features/library/useLibrary';
import { usePlaylists } from '@/features/playlists/usePlaylists';
import { t } from '@/i18n';
import { playQueue } from '@/services/audio/controller';
import type { PlaylistSummary, Track } from '@/types';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Header } from './Header';
import { LibraryRelated, type LibraryCategory } from './LibraryRelated';
import { catalog } from '@/services/catalog';
import type { CatalogArtist } from '@/services/catalog/types';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';

type LibraryRow =
  | { id: string; type: 'section'; title: string }
  | { id: string; type: 'playlist'; playlist: PlaylistSummary }
  | { id: string; type: 'system'; kind: 'liked' | 'history'; title: string; count: number; uris: string[] }
  | { id: string; type: 'track'; track: Track; index: number; queue: Track[] };

function PlaylistRow({ cover, title, count, pinned, onPress, onLongPress }: {
  cover: ReactNode; title: string; count: number; pinned?: boolean; onPress: () => void; onLongPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [s.playlistRow, pressed && s.pressed]}
    >
      {cover}
      <View style={s.playlistInfo}>
        <View style={s.playlistTitleRow}>
          <Text numberOfLines={1} style={s.playlistTitle}>{title}</Text>
          {pinned ? <Icon name="pin" size={14} color={colors.accent} /> : null}
        </View>
        <Text style={s.playlistSubtitle}>{t('common.tracks', { count })}</Text>
      </View>
    </Pressable>
  );
}

export function Library({ openCategory, openNonce }: { openCategory?: LibraryCategory; openNonce?: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<LibraryCategory | null>(openCategory ?? null);
  useEffect(() => {
    if (openCategory) setCategory(openCategory);
  }, [openCategory, openNonce]);
  const favorites = useFavorites();
  const history = useHistory(100);
  const playlists = usePlaylists();
  const current = usePlayerStore(selectCurrentTrack);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [importing, setImporting] = useState(false);
  const [pinTarget, setPinTarget] = useState<PlaylistSummary | null>(null);
  const [artists, setArtists] = useState<CatalogArtist[]>([]);
  const isPlaylist = category === 'playlists';
  const historyTracks = history.data.map(({ track }) => track);
  const tracks = category === 'favorites'
    ? favorites.data
    : category === 'history'
      ? historyTracks
      : [...new Map([...favorites.data, ...historyTracks].map((track) => [track.id, track])).values()];
  const artistNames = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    history.data.forEach(({ track }, index) => {
      for (const name of track.artist.split(',').map((part) => part.trim()).filter(Boolean)) {
        const key = name.toLocaleLowerCase();
        const previous = counts.get(key);
        counts.set(key, { name: previous?.name ?? name, count: (previous?.count ?? 0) + 100 - index });
      }
    });
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [history.data]);

  const loading = category === null || isPlaylist
    ? playlists.loading || favorites.loading || history.loading
    : category === 'favorites'
        ? favorites.loading
        : history.loading;
  const emptyMessage = category === null
    ? t('library.emptyAll')
    : isPlaylist
      ? t('library.emptyPlaylists')
      : category === 'favorites'
        ? t('library.emptyLiked')
        : t('library.emptyHistory');
  const title = category === null
    ? t('library.all')
    : isPlaylist
      ? t('library.tab.playlists')
      : category === 'favorites'
        ? t('library.tab.liked')
        : t('library.tab.history');
  const systemRows: LibraryRow[] = [
    {
      id: 'system-liked',
      type: 'system',
      kind: 'liked',
      title: t('library.tab.liked'),
      count: favorites.data.length,
      uris: favorites.data.slice(0, 4).map((track) => track.artworkUrl),
    },
    {
      id: 'system-history',
      type: 'system',
      kind: 'history',
      title: t('library.tab.history'),
      count: historyTracks.length,
      uris: historyTracks.slice(0, 4).map((track) => track.artworkUrl),
    },
  ];
  const playlistRows: LibraryRow[] = playlists.data.map((playlist) => ({ id: `playlist-${playlist.id}`, type: 'playlist' as const, playlist }));
  const rows: LibraryRow[] = category === null
    ? [{ id: 'section-playlists', type: 'section', title: t('library.tab.playlists') }, ...systemRows, ...playlistRows]
    : isPlaylist
      ? [...systemRows, ...playlistRows]
      : tracks.map((track, index) => ({ id: `${track.id}-${index}`, type: 'track' as const, track, index, queue: tracks }));

  useEffect(() => {
    let active = true;
    const fallbackArtists = artistNames.map(({ name }) => ({
      id: 'search',
      name,
      subtitle: '',
      imageUrl: null,
    }));
    setArtists(fallbackArtists);

    if (!artistNames.length) return () => { active = false; };

    void Promise.all(artistNames.map(async ({ name }) => {
      try {
        const results = await catalog.searchArtists(name);
        const exact = results.find((artist) => artist.name.toLocaleLowerCase() === name.toLocaleLowerCase());
        return exact ?? { id: 'search', name, subtitle: '', imageUrl: null };
      } catch {
        return { id: 'search', name, subtitle: '', imageUrl: null };
      }
    })).then((resolved) => {
      if (active) setArtists(resolved);
    });

    return () => { active = false; };
  }, [artistNames]);

  return (
    <View style={s.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => item.type === 'section' ? (
          <Text style={s.groupTitle}>{item.title}</Text>
        ) : item.type === 'track' ? (
          <TrackRow
            track={item.track}
            active={item.track.id === current?.id}
            onPress={() => playQueue(item.queue, item.index)}
            onMore={() => setMenuTrack(item.track)}
          />
        ) : item.type === 'system' ? (
          <PlaylistRow
            cover={<MosaicCover uris={item.uris} size={56} radius={radius.sm} seed={`virtual-${item.kind}`} />}
            title={item.title}
            count={item.count}
            onPress={() => router.push({ pathname: '/library/[kind]', params: { kind: item.kind } })}
          />
        ) : (
          <PlaylistRow
            cover={<Cover uri={item.playlist.coverUrl} size={56} />}
            title={item.playlist.name}
            count={item.playlist.trackCount}
            pinned={item.playlist.pinned}
            onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: String(item.playlist.id) } })}
            onLongPress={() => setPinTarget(item.playlist)}
          />
        )}
        ListHeaderComponent={(
          <>
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
            {category === null && artists.length ? (
              <View style={s.artistsSection}>
                <Text style={s.artistsTitle}>{t('library.recentArtists')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.artistsRow}>
                  {artists.map((artist) => (
                    <Pressable
                      key={`${artist.id}-${artist.name}`}
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: '/artist/[id]', params: { id: artist.id, name: artist.name } })}
                      style={({ pressed }) => [s.artist, pressed && s.pressed]}
                    >
                      <View style={s.artistImage}>
                        {artist.imageUrl
                          ? <ArtworkImage uri={artist.imageUrl} style={s.artistImageContent} />
                          : <Text style={s.artistInitial}>{artist.name.slice(0, 1).toLocaleUpperCase()}</Text>}
                      </View>
                      <Text numberOfLines={1} style={s.artistName}>{artist.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <View style={s.heading}>
              <Text style={s.title}>{title}</Text>
              {!isPlaylist && tracks.length ? (
                <Pressable accessibilityRole="button" onPress={() => playQueue(tracks, 0)} style={s.playButton}>
                  <Text style={s.playLabel}>▶ {t('library.playAll')}</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
        ListEmptyComponent={<EmptyState loading={loading} message={loading ? t('common.loading') : emptyMessage} />}
        contentContainerStyle={s.list}
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
      <ActionSheet
        visible={pinTarget !== null}
        title={pinTarget?.name}
        items={pinTarget ? [{
          icon: pinTarget.pinned ? 'pin' : 'pin-outline',
          label: pinTarget.pinned ? t('playlist.unpin') : t('playlist.pin'),
          onPress: () => void playlists.setPinned(pinTarget.id, !pinTarget.pinned),
        }] : []}
        onClose={() => setPinTarget(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.md },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  groupTitle: { color: colors.text, fontSize: font.md, fontWeight: '700', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  list: { paddingBottom: spacing.xl },
  playButton: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  playLabel: { color: colors.accentText, fontSize: font.sm, fontWeight: '800' },
  playlistRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  playlistInfo: { flex: 1 },
  playlistTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  playlistTitle: { color: colors.text, fontSize: font.md, fontWeight: '700', flexShrink: 1 },
  playlistSubtitle: { color: colors.textMuted, fontSize: font.sm, marginTop: 3 },
  artistsSection: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  artistsTitle: { color: colors.text, fontSize: font.md, fontWeight: '700', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  artistsRow: { gap: spacing.md, paddingHorizontal: spacing.md },
  artist: { width: 76, alignItems: 'center', gap: spacing.xs },
  artistImage: { width: 68, height: 68, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.accent },
  artistImageContent: { width: '100%', height: '100%' },
  artistInitial: { color: colors.text, fontSize: font.xl, fontWeight: '700' },
  artistName: { width: '100%', color: colors.text, fontSize: font.xs, textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
