import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, LayoutAnimation, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { gradientFor } from '@/utils/color';
import { formatTotalDuration } from '@/utils/track';
import { importLocalAudioToPlaylist } from '@/storage/localAudio';
import {
  getDownloadedTrackIds, isDownloadCancelled, startTrackDownload, type DownloadProgress,
  type TrackDownloadTask,
} from '@/features/downloads';
import { moveItem } from '@/utils/moveItem';
import { colors, font, layout, spacing } from '@/theme/tokens';
import { requestDialog } from '@/components/OverlayDialogHost';
import { showToast } from '@/components/overlay';

const COVER = 190;

function showNotice(title: string, message: string): void {
  showToast(message, { icon: title === t('common.error') ? 'warning-outline' : 'checkmark-circle-outline' });
}

type PlaylistDownloadStatus = 'queued' | 'downloading' | 'completed' | 'failed' | 'cancelled';

interface PlaylistDownloadRow {
  track: Track;
  status: PlaylistDownloadStatus;
  progress: DownloadProgress | null;
  error?: string;
}

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
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>();
  const [sheet, setSheet] = useState(false);
  const [sheetPosition, setSheetPosition] = useState<{ x: number; y: number }>();
  const [renaming, setRenaming] = useState(false);
  const [importingLocalAudio, setImportingLocalAudio] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [draggedTracks, setDraggedTracks] = useState<Track[] | null>(null);
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [downloadRows, setDownloadRows] = useState<PlaylistDownloadRow[]>([]);
  const [downloadQueueRunning, setDownloadQueueRunning] = useState(false);
  const activeDownload = useRef<TrackDownloadTask | null>(null);
  const cancelDownloadQueue = useRef(false);
  const queueRunning = useRef(false);
  const screenMounted = useRef(true);
  const downloadRowsRef = useRef(downloadRows);
  downloadRowsRef.current = downloadRows;
  const updateDownloadRows = (update: (rows: PlaylistDownloadRow[]) => PlaylistDownloadRow[]) => {
    if (screenMounted.current) setDownloadRows(update);
  };
  const dragStart = useRef<number | null>(null);
  const dragTarget = useRef<number | null>(null);
  const dragOffset = useRef(new Animated.Value(0)).current;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const displayedTracks = draggedTracks ?? tracks;
  const dragStartAt = useCallback((index: number) => {
    dragStart.current = index;
    dragTarget.current = index;
    dragOffset.setValue(0);
    setDraggingTrackId(tracksRef.current[index]?.id ?? null);
    setDraggedTracks(tracksRef.current);
  }, [dragOffset]);
  const dragTo = useCallback((start: number, offset: number) => {
    const target = Math.max(0, Math.min(tracksRef.current.length - 1, start + Math.round(offset / 68)));
    dragOffset.setValue(offset - (target - start) * 68);
    if (target === dragTarget.current) return;
    dragTarget.current = target;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setDraggedTracks(moveItem(tracksRef.current, start, target));
  }, [dragOffset]);
  const finishDrag = useCallback((cancelled = false) => {
    const from = dragStart.current;
    const to = dragTarget.current;
    dragStart.current = null;
    dragTarget.current = null;
    if (!cancelled && from !== null && to !== null && from !== to) {
      void move(from, to)
        .catch((error: unknown) => {
          showNotice(t('common.error'), error instanceof Error ? error.message : t('common.error'));
        })
        .finally(() => {
          setDraggedTracks(null);
          setDraggingTrackId(null);
          dragOffset.setValue(0);
        });
    } else {
      setDraggedTracks(null);
      setDraggingTrackId(null);
      dragOffset.setValue(0);
    }
  }, [dragOffset, move]);
  useEffect(() => {
    screenMounted.current = true;
    return () => {
      screenMounted.current = false;
      cancelDownloadQueue.current = true;
      activeDownload.current?.cancel();
    };
  }, []);
  const deletePlaylist = async () => {
    await remove();
    if (router.canGoBack()) router.back();
    else router.replace('/library');
  };
  const confirmDelete = () => {
    const message = t('playlist.deleteMessage', { name: playlist?.name ?? '' });
    void requestDialog({
      title: t('playlist.deleteTitle'),
      message,
      confirmLabel: t('common.delete'),
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) void deletePlaylist();
    }).catch((error: unknown) => showNotice(t('common.error'), error instanceof Error ? error.message : t('common.error')));
  };

  if (!loading && !playlist) {
    return (
      <View style={s.root}>
        <View style={[s.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <IconButton
            icon="chevron-back"
            label={t('common.back')}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/library')}
          />
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
    ...(tracks.length ? [{
      icon: 'play-circle-outline' as const,
      label: t('playlist.addToQueue'),
      onPress: () => { addToQueueEnd(tracks); showToast(t('actions.queued')); },
    }] : []),
    ...(downloadQueueRunning
      ? [{
        icon: 'close-circle-outline' as const,
        label: t('downloads.cancelQueue'),
        onPress: () => {
          cancelDownloadQueue.current = true;
          activeDownload.current?.cancel();
        },
      }]
      : [
        ...(tracks.length ? [{
          icon: 'download-outline' as const,
          label: t('playlist.download'),
          onPress: () => void runPlaylistDownloads(false),
        }] : []),
        ...(tracks.length && downloadRows.some((row) => row.status === 'failed') ? [{
          icon: 'refresh-outline' as const,
          label: t('playlist.retryDownloads'),
          onPress: () => void runPlaylistDownloads(true),
        }] : []),
      ]),
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
      showNotice(
        t('playlist.importLocalAudio'),
        t('playlist.importLocalAudioResult', { added: result.added, skipped: result.skipped }),
      );
    } catch (error) {
      showNotice(
        t('playlist.importLocalAudio'),
        error instanceof Error ? error.message : t('playlist.importLocalAudioFailed'),
      );
    } finally {
      setImportingLocalAudio(false);
    }
  }

  async function runPlaylistDownloads(retryFailures: boolean) {
    if (queueRunning.current || !tracks.length) return;
    queueRunning.current = true;
    cancelDownloadQueue.current = false;
    setDownloadQueueRunning(true);
    try {
      const downloadedIds = await getDownloadedTrackIds(tracks.map((track) => track.id));
      const availableIds = new Set([
        ...downloadedIds,
        ...tracks.filter((track) => track.source === 'local').map((track) => track.id),
      ]);
      const failedIds = new Set(
        downloadRowsRef.current.filter((row) => row.status === 'failed').map((row) => row.track.id),
      );
      const candidates = retryFailures
        ? tracks.filter((track) => track.source === 'youtube' && failedIds.has(track.id) && !availableIds.has(track.id))
        : tracks.filter((track) => track.source === 'youtube' && !availableIds.has(track.id));

      if (!retryFailures) {
        if (screenMounted.current) {
          setDownloadRows(tracks.map((track) => ({
            track,
            status: availableIds.has(track.id) ? 'completed' : 'queued',
            progress: null,
          })));
        }
      } else {
        updateDownloadRows((rows) => rows.map((row) => {
          if (availableIds.has(row.track.id)) return { ...row, status: 'completed', progress: null };
          if (failedIds.has(row.track.id)) return { ...row, status: 'queued', progress: null, error: undefined };
          return row;
        }));
      }

      for (const track of candidates) {
        if (cancelDownloadQueue.current) break;
        updateDownloadRows((rows) => rows.map((row) => row.track.id === track.id
          ? { ...row, status: 'downloading', progress: null }
          : row));
        try {
          const task = startTrackDownload(track, (progress) => {
            updateDownloadRows((rows) => rows.map((row) => row.track.id === track.id
              ? { ...row, progress }
              : row));
          });
          activeDownload.current = task;
          await task.promise;
          updateDownloadRows((rows) => rows.map((row) => row.track.id === track.id
            ? { ...row, status: 'completed', progress: { fraction: 1, bytesWritten: 0, totalBytes: 0 }, error: undefined }
            : row));
        } catch (error) {
          if (isDownloadCancelled(error) || cancelDownloadQueue.current) {
            updateDownloadRows((rows) => rows.map((row) => row.track.id === track.id
              ? { ...row, status: 'cancelled', progress: null }
              : row));
            break;
          }
          updateDownloadRows((rows) => rows.map((row) => row.track.id === track.id
            ? { ...row, status: 'failed', progress: null, error: error instanceof Error ? error.message : t('common.error') }
            : row));
        } finally {
          activeDownload.current = null;
        }
      }

      if (cancelDownloadQueue.current) {
        updateDownloadRows((rows) => rows.map((row) => row.status === 'queued'
          ? { ...row, status: 'cancelled' }
          : row));
      }
    } catch (error) {
      if (screenMounted.current) {
        showNotice(t('common.error'), error instanceof Error ? error.message : t('common.error'));
      }
    } finally {
      queueRunning.current = false;
      if (screenMounted.current) setDownloadQueueRunning(false);
    }
  }

  const completedDownloads = downloadRows.filter((row) => row.status === 'completed').length;
  const activeDownloads = downloadRows.filter((row) => row.status === 'downloading').length;
  const failedDownloads = downloadRows.filter((row) => row.status === 'failed').length;
  const overallProgress = tracks.length > 0
    ? Math.round(downloadRows.reduce((total, row) => {
      if (row.status === 'completed') return total + 1;
      if (row.status === 'downloading') return total + (row.progress?.fraction ?? 0);
      return total;
    }, 0) / tracks.length * 100)
    : 0;

  const seed = `pl-${playlistId}`;
  const [top] = gradientFor(seed, colors.bg);
  const meta = [t('common.tracks', { count: tracks.length }), formatTotalDuration(tracks)].filter(Boolean).join(' · ');
  const playPlaylist = async (startIndex: number, shuffledTracks = false) => {
    await setRepeat('off');
    await playQueue(tracks, startIndex, shuffledTracks ? true : undefined);
  };

  const header = (
    <View>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reordering ? t('playlist.doneReordering') : t('playlist.reorder')}
            hitSlop={10}
            onPress={() => setReordering((value) => !value)}
            style={({ pressed }) => [s.editButton, pressed && { opacity: 0.6 }]}
          >
            <Icon name={reordering ? 'checkmark' : 'pencil-outline'} size={20} color={colors.text} />
          </Pressable>
        </View>
      </LinearGradient>
      {downloadRows.length > 0 ? (
        <View style={s.downloadPanel}>
          <View style={s.downloadHeader}>
            <Text style={s.downloadSummary}>
              {t('downloads.queueSummary', {
                completed: completedDownloads,
                total: tracks.length,
                active: activeDownloads,
                failed: failedDownloads,
              })}
            </Text>
            {downloadQueueRunning ? (
              <Pressable onPress={() => {
                cancelDownloadQueue.current = true;
                activeDownload.current?.cancel();
              }}>
                <Text style={s.cancelQueue}>{t('downloads.cancelQueue')}</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={s.downloadProgressTrack}>
            <View style={[s.downloadProgressFill, { width: `${overallProgress}%` }]} />
          </View>
          <ScrollView style={s.downloadList} nestedScrollEnabled>
            {downloadRows.map((row) => {
              const status = row.status === 'failed'
                ? t('downloads.failed', { error: row.error ?? t('common.error') })
                : row.status === 'downloading'
                  ? row.progress?.fraction === null || row.progress?.fraction === undefined
                    ? t('downloads.inProgress')
                    : `${t('downloads.inProgress')} · ${Math.round(row.progress.fraction * 100)}%`
                  : t(`downloads.${row.status}` as const);
              return (
                <View key={row.track.id} style={s.downloadRow}>
                  <Text numberOfLines={1} style={s.downloadTrack}>{row.track.title}</Text>
                  <Text numberOfLines={1} style={[s.downloadState, row.status === 'failed' && { color: colors.danger }]}>
                    {status}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        data={displayedTracks}
        keyExtractor={(tr) => tr.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: layout.listBottomPad }}
        renderItem={({ item, index }) => (
          <Animated.View style={[
            item.id === draggingTrackId && s.draggingRow,
            item.id === draggingTrackId && { transform: [{ translateY: dragOffset }] },
          ]}>
            <TrackRow
              track={item} active={item.id === current?.id}
              onPress={() => { if (!reordering) void playPlaylist(index); }}
              onMore={reordering ? undefined : (position) => { setMenuTrack(item); setMenuPosition(position); }}
              trailing={reordering ? (
                <DragHandle
                  index={index}
                  onStart={dragStartAt}
                  onMove={dragTo}
                  onFinish={finishDrag}
                />
              ) : undefined}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          loading ? <TrackRowSkeleton count={4} />
          : <EmptyState icon="musical-notes" title={t('playlist.emptyTitle')} message={t('playlist.emptyBody')}
              actionLabel={t('playlist.emptyAction')} onAction={() => router.push('/search')} />
        }
      />

      <View style={[s.topBar, s.topBarAbs, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <IconButton
          icon="chevron-back"
          filled
          label={t('common.back')}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/library')}
        />
        <IconButton
          icon="ellipsis-horizontal"
          filled
          label={t('common.more')}
          onPress={() => setSheet(true)}
          onPressWithPosition={setSheetPosition}
        />
      </View>

      <ActionSheet
        visible={sheet}
        title={playlist?.name}
        items={items}
        position={sheetPosition}
        onClose={() => { setSheet(false); setSheetPosition(undefined); }}
      />
      <TextPromptModal
        visible={renaming} title={t('playlist.renameTitle')} initialValue={playlist?.name ?? ''}
        placeholder={t('playlist.namePlaceholder')} confirmLabel={t('common.save')} error={renameError}
        onClose={() => setRenaming(false)}
        onSubmit={async (name) => {
          try { await rename(name); setRenaming(false); }
          catch (e) { setRenameError(e instanceof Error ? e.message : t('common.error')); }
        }}
      />
      <TrackActionsModal
        track={menuTrack}
        position={menuPosition}
        onClose={() => { setMenuTrack(null); setMenuPosition(undefined); }}
        onRemoveFromPlaylist={removeTrack}
      />
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
    onStartShouldSetPanResponderCapture: () => true,
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
    onPanResponderTerminationRequest: () => false,
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
  editButton: { padding: 2, transform: [{ translateY: 8 }] },
  dragHandle: { paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  draggingRow: {
    elevation: 8,
    zIndex: 1,
  },
  downloadPanel: { marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md, borderRadius: 12, backgroundColor: colors.surfaceAlt, gap: spacing.sm },
  downloadHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  downloadSummary: { color: colors.text, fontSize: font.sm, flex: 1 },
  cancelQueue: { color: colors.accent, fontSize: font.sm, fontWeight: '700' },
  downloadProgressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.surface, overflow: 'hidden' },
  downloadProgressFill: { height: 4, backgroundColor: colors.accent },
  downloadList: { maxHeight: 132 },
  downloadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  downloadTrack: { color: colors.textMuted, fontSize: font.sm, flex: 1 },
  downloadState: { color: colors.text, fontSize: font.sm },
  fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
});
