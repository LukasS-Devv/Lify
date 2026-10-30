import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, IconButton, MosaicCover, TrackActionsModal, TrackRow, TrackRowSkeleton } from '@/components';
import { useFavorites, useHistory } from '@/features/library/useLibrary';
import { t, useTranslation } from '@/i18n';
import { playQueue } from '@/services/audio/controller';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';
import type { Track } from '@/types';
import { gradientFor } from '@/utils/color';
import { formatTotalDuration } from '@/utils/track';
import { colors, font, layout, spacing } from '@/theme/tokens';

const COVER = 190;

export default function VirtualPlaylistDetail() {
  useTranslation();
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const isLiked = kind !== 'history';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const favorites = useFavorites();
  const history = useHistory(500);
  const current = usePlayerStore(selectCurrentTrack);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>();

  const tracks: Track[] = isLiked
    ? favorites.data
    : history.data.map(({ track }) => track);
  const loading = isLiked ? favorites.loading : history.loading;
  const title = isLiked ? t('library.tab.liked') : t('library.tab.history');
  const emptyMessage = isLiked ? t('library.emptyLiked') : t('library.emptyHistory');

  const seed = `virtual-${isLiked ? 'liked' : 'history'}`;
  const [top] = gradientFor(seed, colors.bg);
  const meta = [t('common.tracks', { count: tracks.length }), formatTotalDuration(tracks)].filter(Boolean).join(' · ');

  const header = (
    <LinearGradient colors={[top, colors.bg]} style={[s.hero, { paddingTop: insets.top + 64 }]}>
      <MosaicCover uris={tracks.slice(0, 4).map((tr) => tr.artworkUrl)} size={COVER} seed={seed} />
      <Text numberOfLines={2} style={s.title}>{title}</Text>
      <Text style={s.meta}>{meta}</Text>
      <View style={s.actions}>
        <IconButton icon="shuffle" size={26} label={t('common.shuffle')} disabled={!tracks.length} onPress={() => playQueue(tracks, 0, true)} />
        <IconButton icon="play" size={30} label={t('common.play')} disabled={!tracks.length} color={colors.accent} onPress={() => tracks.length && playQueue(tracks, 0)} />
      </View>
    </LinearGradient>
  );

  return (
    <View style={s.root}>
      <FlatList
        data={tracks}
        keyExtractor={(tr, index) => `${tr.id}-${index}`}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: layout.listBottomPad }}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            active={item.id === current?.id}
            onPress={() => playQueue(tracks, index)}
            onMore={(position) => { setMenuTrack(item); setMenuPosition(position); }}
          />
        )}
        ListEmptyComponent={
          loading ? <TrackRowSkeleton count={4} /> : <EmptyState message={emptyMessage} />
        }
        showsVerticalScrollIndicator={false}
      />

      <View style={[s.topBar, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <IconButton
          icon="chevron-back"
          filled
          label={t('common.back')}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/library')}
        />
      </View>

      <TrackActionsModal
        track={menuTrack}
        position={menuPosition}
        onClose={() => { setMenuTrack(null); setMenuPosition(undefined); void favorites.reload(); void history.reload(); }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  hero: { alignItems: 'center', paddingBottom: spacing.md, paddingHorizontal: spacing.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm },
  meta: { color: colors.textMuted, fontSize: font.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },
});
