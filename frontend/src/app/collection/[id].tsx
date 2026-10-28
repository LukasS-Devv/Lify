import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cover, EmptyState, IconButton, TrackRow, TrackRowSkeleton } from '@/components';
import { t, useTranslation } from '@/i18n';
import { catalog, type CatalogCollection } from '@/services/catalog';
import { playQueue } from '@/services/audio/controller';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';
import type { Track } from '@/types';
import { shuffled } from '@/utils/array';
import { gradientFor } from '@/utils/color';
import { formatTotalDuration } from '@/utils/track';
import { colors, font, layout, spacing } from '@/theme/tokens';

const COVER_SIZE = 190;

export default function CollectionScreen() {
  useTranslation();
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const collectionKind = kind === 'playlist' ? 'playlist' : 'album';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const current = usePlayerStore(selectCurrentTrack);
  const [collection, setCollection] = useState<CatalogCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCollection(null);
    void catalog.getCollection(id, collectionKind).then((result) => {
      if (active) setCollection(result);
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : t('artist.collectionLoadFailed'));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id, collectionKind, attempt]);

  const tracks: Track[] = collection?.tracks ?? [];
  const seed = `catalog-${id}`;
  const [top] = gradientFor(seed, colors.bg);
  const meta = [
    collectionKind === 'playlist' ? t('artist.playlists') : t('artist.album'),
    t('common.tracks', { count: tracks.length }),
    formatTotalDuration(tracks),
  ].filter(Boolean).join(' · ');

  const header = (
    <LinearGradient colors={[top, colors.bg]} style={[s.hero, { paddingTop: insets.top + 72 }]}>
      <Cover uri={collection?.imageUrl} size={COVER_SIZE} seed={seed} />
      <Text numberOfLines={2} style={s.title}>{collection?.title ?? ''}</Text>
      {collection?.subtitle ? <Text numberOfLines={2} style={s.subtitle}>{collection.subtitle}</Text> : null}
      <Text style={s.meta}>{meta}</Text>
      <View style={s.actions}>
        <IconButton
          icon="shuffle"
          size={26}
          label={t('common.shuffle')}
          disabled={!tracks.length}
          onPress={() => playQueue(shuffled(tracks), 0)}
        />
        <IconButton
          icon="play"
          size={30}
          label={t('common.play')}
          disabled={!tracks.length}
          color={colors.accent}
          onPress={() => tracks.length && playQueue(tracks, 0)}
        />
      </View>
    </LinearGradient>
  );

  return (
    <View style={s.root}>
      <FlatList
        data={tracks}
        keyExtractor={(track) => track.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: layout.listBottomPad }}
        renderItem={({ item, index }) => (
          <TrackRow track={item} active={item.id === current?.id} onPress={() => playQueue(tracks, index)} />
        )}
        ListEmptyComponent={
          loading ? <TrackRowSkeleton count={5} />
            : error
              ? <EmptyState message={error} actionLabel={t('common.retry')} onAction={() => setAttempt((n) => n + 1)} />
              : <EmptyState icon="musical-notes" message={t('artist.collectionEmpty')} />
        }
        showsVerticalScrollIndicator={false}
      />
      <View style={[s.topBar, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <IconButton
          icon="chevron-back"
          filled
          label={t('common.back')}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/search')}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, paddingHorizontal: spacing.md },
  hero: { alignItems: 'center', paddingBottom: spacing.md, paddingHorizontal: spacing.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, fontSize: font.sm, textAlign: 'center' },
  meta: { color: colors.textMuted, fontSize: font.sm, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },
});
