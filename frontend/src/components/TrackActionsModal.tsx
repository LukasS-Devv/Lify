import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PlaylistSummary, Track } from '@/types';
import { favoritesRepo, getDb, playlistsRepo } from '@/database';
import {
  getTrackDownloadState, isDownloadCancelled, removeTrackDownload, startTrackDownload,
  type DownloadProgress, type TrackDownloadState, type TrackDownloadTask,
} from '@/features/downloads';
import { toggleFavoriteWithFeedback } from '@/features/favorites/favoriteFeedback';
import { addToQueueEnd, addToQueueNext } from '@/services/audio/controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Cover } from './Cover';
import { Icon, type IconName } from './Icon';

/** Menu de ações de uma faixa: curtir, fila, adicionar a playlist. */
export function TrackActionsModal({ track, onClose, onRemoveFromPlaylist, onSleepTimer, showIcons = true }: {
  track: Track | null; onClose: () => void; onRemoveFromPlaylist?: (t: Track) => void; onSleepTimer?: () => void; showIcons?: boolean;
}) {
  useTranslation();
  const insets = useSafeAreaInsets();
  const [fav, setFav] = useState(false);
  const [lists, setLists] = useState<PlaylistSummary[]>([]);
  const [showLists, setShowLists] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<TrackDownloadState['status']>('none');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const downloadTask = useRef<TrackDownloadTask | null>(null);

  useEffect(() => {
    if (!track) return;
    setShowLists(false); setMsg(null);
    setDownloadState('none');
    setDownloadProgress(null);
    setDownloadBusy(false);
    let active = true;
    (async () => {
      const db = await getDb();
      const favorite = await favoritesRepo.isFavorite(db, track.id);
      const playlists = await playlistsRepo.listPlaylists(db);
      if (!active) return;
      setFav(favorite);
      setLists(playlists);
      if (track.source === 'youtube') {
        const state = await getTrackDownloadState(track.id);
        if (active) setDownloadState(state.status);
      }
    })().catch((error: unknown) => {
      if (active) setMsg(error instanceof Error ? error.message : t('common.error'));
    });
    return () => {
      active = false;
      downloadTask.current?.cancel();
      downloadTask.current = null;
    };
  }, [track]);

  if (!track) return null;

  const run = async (fn: () => Promise<string | void> | string | void) => {
    try {
      const m = await fn();
      if (m) setMsg(m);
      else onClose();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t('common.error'));
    }
  };

  const confirmRemoveDownload = () => {
    if (downloadBusy) return;
    Alert.alert(t('downloads.removeConfirmTitle'), t('downloads.removeConfirmMessage'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () => void run(async () => {
          await removeTrackDownload(track.id);
          setDownloadState('none');
          return t('actions.downloadRemoved');
        }),
      },
    ]);
  };

  const downloadOrRemove = async () => {
    if (downloadBusy) return;
    if (downloadState === 'available') {
      confirmRemoveDownload();
      return;
    }

    setDownloadBusy(true);
    setDownloadProgress({ fraction: 0, bytesWritten: 0, totalBytes: 0 });
    try {
      const task = startTrackDownload(track, setDownloadProgress);
      downloadTask.current = task;
      await task.promise;
      setDownloadState('available');
      setMsg(t('actions.downloadComplete'));
    } catch (error) {
      setMsg(isDownloadCancelled(error)
        ? t('downloads.cancelled')
        : error instanceof Error ? error.message : t('common.error'));
    } finally {
      downloadTask.current = null;
      setDownloadBusy(false);
      setDownloadProgress(null);
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}>
        <View style={s.head}>
          <Cover uri={track.artworkUrl} size={48} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={s.title}>{track.title}</Text>
            <Text numberOfLines={1} style={s.sub}>{track.artist}</Text>
          </View>
        </View>
        {msg ? <Text style={s.msg}>{msg}</Text> : null}
        {downloadState === 'invalid' ? <Text style={s.invalid}>{t('downloads.invalid')}</Text> : null}
        {downloadBusy ? (
          <View style={s.downloadStatus}>
            <Text style={s.sub}>
              {downloadProgress?.fraction === null || downloadProgress?.fraction === undefined
                ? t('downloads.inProgress')
                : `${t('downloads.inProgress')} · ${Math.round(downloadProgress.fraction * 100)}%`}
            </Text>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.round((downloadProgress?.fraction ?? 0) * 100)}%` }]} />
            </View>
          </View>
        ) : null}

        {showLists ? (
          <ScrollView style={{ maxHeight: 280 }}>
            {lists.length === 0 ? <Text style={s.sub}>{t('actions.noPlaylists')}</Text> : null}
            {lists.map((p) => (
              <Item key={p.id} icon="list" showIcon={showIcons} label={p.name} onPress={() => run(async () => {
                const added = await playlistsRepo.addTrackToPlaylist(await getDb(), p.id, track);
                return added ? t('actions.addedTo', { name: p.name }) : t('actions.alreadyIn', { name: p.name });
              })} />
            ))}
          </ScrollView>
        ) : (
          <>
            <Item icon={fav ? 'heart' : 'heart-outline'} showIcon={showIcons} label={fav ? t('actions.unlike') : t('actions.like')} onPress={() => run(async () => {
              const now = await toggleFavoriteWithFeedback(track);
              setFav(now);
              return now ? undefined : t('actions.unliked');
            })} />
            <Item icon="add-circle-outline" showIcon={showIcons} label={t('actions.addToPlaylist')} onPress={() => setShowLists(true)} />
            <Item icon="play-forward-outline" showIcon={showIcons} label={t('actions.playNext')} onPress={() => run(() => { addToQueueNext(track); return t('actions.queued'); })} />
            <Item icon="list-outline" showIcon={showIcons} label={t('actions.addToQueue')} onPress={() => run(() => { addToQueueEnd([track]); return t('actions.queued'); })} />
            {track.source === 'youtube' && !downloadBusy ? (
              <Item
                icon={downloadState === 'available' ? 'checkmark-circle-outline' : 'download-outline'}
                showIcon={showIcons}
                label={downloadState === 'available' ? t('actions.downloaded') : t('actions.download')}
                danger={downloadState === 'available'}
                onPress={() => void downloadOrRemove()}
              />
            ) : null}
            {downloadBusy ? (
              <Item icon="close-circle-outline" showIcon={showIcons} label={t('downloads.cancel')} danger
                onPress={() => downloadTask.current?.cancel()} />
            ) : null}
            {track.source === 'youtube' && downloadState === 'invalid' && !downloadBusy ? (
              <Item icon="trash-outline" showIcon={showIcons} label={t('downloads.removeRecord')} danger
                onPress={confirmRemoveDownload} />
            ) : null}
            {onSleepTimer ? <Item icon="timer-outline" showIcon={showIcons} label={t('player.sleepTimer.open')} onPress={onSleepTimer} /> : null}
            {onRemoveFromPlaylist ? (
              <Item icon="trash-outline" showIcon={showIcons} label={t('actions.removeFromPlaylist')} danger onPress={() => { onRemoveFromPlaylist(track); onClose(); }} />
            ) : null}
          </>
        )}
        <Item icon="close" showIcon={showIcons} label={t('common.close')} muted onPress={onClose} />
      </View>
    </Modal>
  );
}

function Item({ icon, label, onPress, danger, muted, showIcon = true }: { icon: IconName; label: string; onPress: () => void; danger?: boolean; muted?: boolean; showIcon?: boolean }) {
  const color = danger ? colors.danger : muted ? colors.textMuted : colors.text;
  return (
    <Pressable onPress={onPress} style={s.item}>
      {showIcon ? <Icon name={icon} size={22} color={color} /> : null}
      <Text style={[s.itemText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surfaceAlt, padding: spacing.md, paddingBottom: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: font.md },
  msg: { color: colors.accent, marginBottom: spacing.sm, fontSize: font.md },
  invalid: { color: colors.danger, marginBottom: spacing.sm, fontSize: font.sm },
  downloadStatus: { gap: spacing.xs, marginBottom: spacing.sm },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.surface, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: colors.accent },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14 },
  itemText: { fontSize: font.lg },
});
