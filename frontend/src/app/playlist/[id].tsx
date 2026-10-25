import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, PanResponder, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActionSheet, Cover, EmptyState, Icon, IconButton, MosaicCover, PressableScale, TextPromptModal,
  TrackActionsModal, TrackRow, TrackRowSkeleton, type SheetItem,
} from '@/components';
import { usePlaylistDetail } from '@/features/playlists/usePlaylists';
import { addToQueueEnd, playQueue, setRepeat } from '@/services/audio/controller';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';
import { t, useTranslation } from '@/i18n';
import type { Track } from '@/types';
import { shuffled } from '@/utils/array';
import { gradientFor } from '@/utils/color';
import { formatTotalDuration } from '@/utils/track';
import { importLocalAudioToPlaylist } from '@/storage/localAudio';
import { moveItem } from '@/utils/moveItem';
import { colors, font, layout, spacing } from '@/theme/tokens';

const COVER = 190;

export default function PlaylistDetail() {
  useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlistId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, loading, reload, rename, remove, setPinned, removeTrack, move } = usePlaylistDetail(playlistId);
  const { playlist, tracks } = data;
  const current = usePlayerStore(selectCurrentTrack);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [sheet, setSheet] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [importingLocalAudio, setImportingLocalAudio] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [draggedTracks, setDraggedTracks] = useState<Track[] | null>(null);
  const dragStart = useRef<number | null>(null);
  const dragTarget = useRef<number | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const displayedTracks = draggedTracks ?? tracks;
  const dragStartAt = useCallback((index: number) => {
    dragStart.current = index;
    dragTarget.current = index;
    setDraggedTracks(tracksRef.current);
  }, []);
  const dragTo = useCallback((start: number, offset: number) => {
    const target = Math.max(0, Math.min(tracksRef.current.length - 1, start + Math.round(offset / 68)));
    if (target === dragTarget.current) return;
    dragTarget.current = target;
    setDraggedTracks(moveItem(tracksRef.current, start, target));
  }, []);
  const finishDrag = useCallback((cancelled = false) => {
    const from = dragStart.current;
    const to = dragTarget.current;
    dragStart.current = null;
    dragTarget.current = null;
    if (!cancelled && from !== null && to !== null && from !== to) {
      void move(from, to)
        .catch((error: unknown) => {
          Alert.alert(t('common.error'), error instanceof Error ? error.message : t('common.error'));
        })
        .finally(() => setDraggedTracks(null));
    } else {
      setDraggedTracks(null);
    }
  }, [move]);
  const confirmDelete = () =>
    Alert.alert(t('playlist.deleteTitle'), t('playlist.deleteMessage', { name: playlist?.name ?? '' }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { await remove(); router.back(); } },
    ]);

  if (!loading && !playlist) {
    return (
      <View style={s.root}>
        <View style={[s.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <IconButton icon="chevron-back" label={t('common.back')} onPress={() => router.back()} />
        </View>
        <EmptyState icon="alert-circle-outline" message={t('playlist.notFound')} />
      </View>
    );
  }

  const items: SheetItem[] = [
    { icon: 'create-outline', label: t('common.rename'), onPress: () => { setRenameError(null); setRenaming(true); } },
    ...(playlist ? [{
      icon: playlist.pinned ? 'pin' as const : 'pin-outline' as const,
      label: playlist.pinned ? t('playlist.unpin') : t('playlist.pin'),
      onPress: () => void setPinned(!playlist.pinned),
    }] : []),
    { icon: 'swap-vertical', label: reordering ? t('playlist.doneReordering') : t('playlist.reorder'), onPress: () => setReordering((r) => !r) },
    ...(tracks.length ? [{ icon: 'list-outline' as const, label: t('playlist.addToQueue'), onPress: () => addToQueueEnd(tracks) }] : []),
    { icon: 'folder-open-outline', label: t('playlist.importLocalAudio'), onPress: () => void importLocalAudio() },
    { icon: 'trash-outline', label: t('common.delete'), danger: true, onPress: confirmDelete },
  ];

  async function importLocalAudio() {
    if (importingLocalAudio) return;
    setImportingLocalAudio(true);
    try {
      const result = await importLocalAudioToPlaylist(playlistId);
      if (result.status === 'cancelled') return;
      await reload();
      Alert.alert(
        t('playlist.importLocalAudio'),
        t('playlist.importLocalAudioResult', { added: result.added, skipped: result.skipped }),
      );
    } catch (error) {
      Alert.alert(
        t('playlist.importLocalAudio'),
        error instanceof Error ? error.message : t('playlist.importLocalAudioFailed'),
      );
    } finally {
      setImportingLocalAudio(false);
    }
  }

  const seed = `pl-${playlistId}`;
  const [top] = gradientFor(seed, colors.bg);
  const meta = [t('common.tracks', { count: tracks.length }), formatTotalDuration(tracks)].filter(Boolean).join(' · ');
  const playPlaylist = async (startIndex: number, shuffledTracks = false) => {
    await setRepeat('off');
    await playQueue(shuffledTracks ? shuffled(tracks) : tracks, startIndex);
  };

  const header = (
    <LinearGradient colors={[top, colors.bg]} style={[s.hero, { paddingTop: insets.top + 64 }]}>
      {playlist?.customCoverUrl
        ? <Cover uri={playlist.customCoverUrl} size={COVER} seed={seed} />
        : <MosaicCover uris={tracks.slice(0, 4).map((tr) => tr.artworkUrl)} size={COVER} seed={seed} />}
      <Text numberOfLines={2} style={s.title}>{playlist?.name ?? ''}</Text>
      <Text style={s.meta}>{meta || t('playlist.kind')}</Text>
      <View style={s.actions}>
        <IconButton icon="shuffle" size={26} label={t('common.shuffle')} disabled={!tracks.length} onPress={() => void playPlaylist(0, true)} />
        <PressableScale
          accessibilityRole="button" accessibilityLabel={t('common.play')}
          onPress={() => tracks.length && void playPlaylist(0)} style={[s.fab, !tracks.length && { opacity: 0.4 }]}
        >
          <Icon name="play" size={30} color={colors.accentText} />
        </PressableScale>
      </View>
    </LinearGradient>
  );

  return (
    <View style={s.root}>
      <FlatList
        data={displayedTracks}
        keyExtractor={(tr) => tr.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: layout.listBottomPad }}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item} active={item.id === current?.id}
            onPress={() => { if (!reordering) void playPlaylist(index); }}
            onMore={reordering ? undefined : () => setMenuTrack(item)}
            trailing={reordering ? (
              <DragHandle
                index={index}
                onStart={dragStartAt}
                onMove={dragTo}
                onFinish={finishDrag}
              />
            ) : undefined}
          />
        )}
        ListEmptyComponent={
          loading ? <TrackRowSkeleton count={4} />
          : <EmptyState icon="musical-notes" title={t('playlist.emptyTitle')} message={t('playlist.emptyBody')}
              actionLabel={t('playlist.emptyAction')} onAction={() => router.push('/search')} />
        }
      />

      <View style={[s.topBar, s.topBarAbs, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <IconButton icon="chevron-back" filled label={t('common.back')} onPress={() => router.back()} />
        <IconButton icon="ellipsis-horizontal" filled label={t('common.more')} onPress={() => setSheet(true)} />
      </View>

      <ActionSheet visible={sheet} title={playlist?.name} items={items} onClose={() => setSheet(false)} />
      <TextPromptModal
        visible={renaming} title={t('playlist.renameTitle')} initialValue={playlist?.name ?? ''}
        placeholder={t('playlist.namePlaceholder')} confirmLabel={t('common.save')} error={renameError}
        onClose={() => setRenaming(false)}
        onSubmit={async (name) => {
          try { await rename(name); setRenaming(false); }
          catch (e) { setRenameError(e instanceof Error ? e.message : t('common.error')); }
        }}
      />
      <TrackActionsModal track={menuTrack} onClose={() => setMenuTrack(null)} onRemoveFromPlaylist={removeTrack} />
    </View>
  );
}

function DragHandle({
  index,
  onStart,
  onMove,
  onFinish,
}: {
  index: number;
  onStart: (index: number) => void;
  onMove: (start: number, offset: number) => void;
  onFinish: (cancelled?: boolean) => void;
}) {
  const indexRef = useRef(index);
  const startRef = useRef<number | null>(null);
  indexRef.current = index;
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => {
      startRef.current = indexRef.current;
      onStart(indexRef.current);
    },
    onPanResponderMove: (_, gesture) => {
      if (startRef.current !== null) onMove(startRef.current, gesture.dy);
    },
    onPanResponderRelease: () => onFinish(),
    onPanResponderTerminate: () => onFinish(true),
  }), [onFinish, onMove, onStart]);
  return (
    <View {...responder.panHandlers} accessibilityRole="button" accessibilityLabel={t('playlist.reorder')} style={s.dragHandle}>
      <Icon name="reorder-three" size={26} color={colors.textMuted} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  topBarAbs: { position: 'absolute', top: 0, left: 0, right: 0 },
  hero: { alignItems: 'center', paddingBottom: spacing.md, paddingHorizontal: spacing.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm },
  meta: { color: colors.textMuted, fontSize: font.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },
  dragHandle: { paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
});
