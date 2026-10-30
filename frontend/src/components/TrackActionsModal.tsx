import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import type { Track } from '@/types';
import { favoritesRepo, getDb } from '@/database';
import {
  getTrackDownloadState, isDownloadCancelled, removeTrackDownload, startTrackDownload,
  type DownloadProgress, type TrackDownloadState, type TrackDownloadTask,
} from '@/features/downloads';
import { toggleFavoriteWithFeedback } from '@/features/favorites/favoriteFeedback';
import { addToQueueEnd, addToQueueNext } from '@/services/audio/controller';
import { catalog } from '@/services/catalog';
import { t, useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme/tokens';
import { ContextMenu } from './Overlays';
import { ConfirmDialog, SheetDivider, SheetHeader, SheetRow, showToast } from './overlay';
import { PlaylistPickerModal } from './PlaylistPickerModal';

/** Menu de ações de uma faixa: favoritos, fila, catálogo e partilha. */
export function TrackActionsModal({ track, onClose, onRemoveFromPlaylist, position }: {
  track: Track | null; onClose: () => void; onRemoveFromPlaylist?: (t: Track) => void; showIcons?: boolean; position?: { x: number; y: number };
}) {
  useTranslation();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const mobile = width < layout.desktopBreakpoint;
  const artistName = track?.artist.split(',')[0].trim() ?? '';
  const [fav, setFav] = useState(false);
  const [showLists, setShowLists] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'removeDownload' | 'cancelDownload' | 'removeFromPlaylist' | null>(null);
  const [downloadState, setDownloadState] = useState<TrackDownloadState['status']>('none');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const downloadTask = useRef<TrackDownloadTask | null>(null);

  useEffect(() => {
    if (!track) return;
    setShowLists(false);
    setConfirmAction(null);
    setDownloadState('none');
    setDownloadProgress(null);
    setDownloadBusy(false);
    let active = true;
    (async () => {
      const db = await getDb();
      const favorite = await favoritesRepo.isFavorite(db, track.id);
      if (!active) return;
      setFav(favorite);
      if (track.source === 'youtube') {
        const state = await getTrackDownloadState(track.id);
        if (active) setDownloadState(state.status);
      }
    })().catch((error: unknown) => {
      if (active) {
        showToast(error instanceof Error ? error.message : t('common.error'), { icon: 'warning-outline' });
      }
    });
    return () => {
      active = false;
      downloadTask.current?.cancel();
      downloadTask.current = null;
    };
  }, [track]);

  if (!track) return null;

  const run = async (fn: () => Promise<string | void> | string | void, successMessage?: string) => {
    try {
      const m = await fn();
      if (m) {
        showToast(m, { icon: 'warning-outline' });
        return;
      }
      if (successMessage) showToast(successMessage);
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('common.error'), { icon: 'warning-outline' });
    }
  };

  const confirmDestructiveAction = () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (!track || !action) return;
    if (action === 'cancelDownload') {
      downloadTask.current?.cancel();
      return;
    }
    if (action === 'removeFromPlaylist') {
      onRemoveFromPlaylist?.(track);
      onClose();
      return;
    }
    void run(async () => {
      await removeTrackDownload(track.id);
      setDownloadState('none');
    }, t('actions.downloadRemoved'));
  };

  const downloadOrRemove = async () => {
    if (downloadBusy) return;
    if (downloadState === 'available') {
      setConfirmAction('removeDownload');
      return;
    }

    setDownloadBusy(true);
    setDownloadProgress({ fraction: 0, bytesWritten: 0, totalBytes: 0 });
    try {
      const task = startTrackDownload(track, setDownloadProgress);
      downloadTask.current = task;
      await task.promise;
      setDownloadState('available');
      showToast(t('actions.downloadComplete'));
    } catch (error) {
      showToast(
        isDownloadCancelled(error) ? t('downloads.cancelled') : error instanceof Error ? error.message : t('common.error'),
        { icon: isDownloadCancelled(error) ? 'checkmark-circle-outline' : 'warning-outline' },
      );
    } finally {
      downloadTask.current = null;
      setDownloadBusy(false);
      setDownloadProgress(null);
    }
  };

  const openArtist = () => {
    if (!artistName) return;
    router.push({ pathname: '/artist/[id]', params: { id: 'search', name: artistName } });
  };

  const openAlbum = async () => {
    if (!track || !track.album || !artistName) return t('actions.albumNotFound');
    const albumTitle = track.album;
    const artists = await catalog.searchArtists(artistName);
    const matches = artists.filter((artist) => normalizeTitle(artist.name) === normalizeTitle(artistName));
    if (matches.length !== 1) return t('actions.albumNotFound');
    const profile = await catalog.getArtist(matches[0].id);
    const collections = [...profile.albums, ...profile.singles, ...profile.eps];
    const album = collections.find((item) => normalizeTitle(item.title) === normalizeTitle(albumTitle));
    if (!album) return t('actions.albumNotFound');
    router.push({ pathname: '/collection/[id]', params: { id: album.id, kind: 'album' } });
  };

  const shareTrack = async () => {
    const url = track.source === 'youtube'
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(track.sourceId)}`
      : undefined;
    const text = `${track.title} — ${track.artist}`;
    if (Platform.OS === 'web') {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: track.title, text, ...(url ? { url } : {}) });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url ?? text);
        showToast(t('actions.linkCopied'));
        return;
      }
      throw new Error(t('actions.shareUnavailable'));
    }
    await Share.share({ title: track.title, message: url ? `${text}\n${url}` : text, ...(url ? { url } : {}) });
  };

  return (
    <>
      <ContextMenu
        visible={!showLists}
        onClose={onClose}
        position={position}
      >
        <SheetHeader
          title={track.title}
          subtitle={track.artist}
          artworkUrl={track.artworkUrl}
        />

        <ScrollView style={[s.actionList, mobile && { maxHeight: Math.max(220, height - 220) }]} bounces={false}>
            <View>
              <SheetRow
                icon={fav ? 'heart' : 'heart-outline'}
                label={fav ? t('actions.unlike') : t('actions.like')}
                selected={fav}
                onPress={() => void run(async () => {
                  const now = await toggleFavoriteWithFeedback(track);
                  setFav(now);
                  if (!now) showToast(t('actions.unliked'));
                })}
              />
              <SheetRow icon="albums-outline" label={t('actions.addToPlaylist')} onPress={() => setShowLists(true)} />
            </View>
            <SheetDivider />
            <View>
              <SheetRow icon="play-forward-outline" label={t('actions.playNext')} onPress={() => void run(() => addToQueueNext(track), t('actions.queued'))} />
              <SheetRow icon="list-outline" label={t('actions.addToQueue')} onPress={() => void run(() => addToQueueEnd([track]), t('actions.queued'))} />
            </View>
            {track.source === 'youtube' ? (
              <>
                <SheetDivider />
                <View>
                  {downloadBusy ? (
                    <>
                      <SheetRow
                        icon="download-outline"
                        label={t('downloads.inProgress')}
                        subtitle={downloadProgress?.fraction == null ? t('common.loading') : `${Math.round(downloadProgress.fraction * 100)}%`}
                        right={downloadProgress?.fraction == null ? <ActivityIndicator size="small" color="#C6E27A" /> : (
                          <View style={s.progressTrack}>
                            <View style={[s.progressFill, { width: `${Math.round(downloadProgress.fraction * 100)}%` }]} />
                          </View>
                        )}
                        disabled
                      />
                      <SheetRow label={t('downloads.cancel')} icon="close-circle-outline" destructive onPress={() => setConfirmAction('cancelDownload')} />
                    </>
                  ) : (
                    <SheetRow
                      icon={downloadState === 'available' ? 'checkmark-circle-outline' : 'download-outline'}
                      label={downloadState === 'available' ? t('actions.downloaded') : t('actions.download')}
                      selected={downloadState === 'available'}
                      subtitle={downloadState === 'invalid' ? t('downloads.invalid') : undefined}
                      onPress={() => void downloadOrRemove()}
                    />
                  )}
                  {downloadState === 'invalid' && !downloadBusy ? (
                    <SheetRow label={t('downloads.removeRecord')} icon="trash-outline" destructive onPress={() => setConfirmAction('removeDownload')} />
                  ) : null}
                </View>
              </>
            ) : null}
            <SheetDivider />
            <View>
              {artistName ? <SheetRow icon="person-outline" label={t('actions.goToArtist')} onPress={() => { openArtist(); onClose(); }} /> : null}
              {track.source === 'youtube' && track.album ? (
                <SheetRow icon="albums-outline" label={t('actions.goToAlbum')} onPress={() => void run(openAlbum)} />
              ) : null}
              {track.source === 'youtube' ? (
                <SheetRow icon="share-outline" label={t('actions.share')} onPress={() => void run(shareTrack)} />
              ) : null}
              {onRemoveFromPlaylist ? (
                <SheetRow icon="trash-outline" label={t('actions.removeFromPlaylist')} destructive onPress={() => setConfirmAction('removeFromPlaylist')} />
              ) : null}
            </View>
        </ScrollView>
      </ContextMenu>
      {showLists ? (
        <PlaylistPickerModal
          track={track}
          title={t('actions.addToPlaylist')}
          subtitle={track.artist}
          artworkUrl={track.artworkUrl}
          onBack={() => setShowLists(false)}
          onCancel={() => setShowLists(false)}
          onConfirm={() => { setShowLists(false); onClose(); }}
          onCreatePlaylist={() => { setShowLists(false); onClose(); router.push('/playlists'); }}
        />
      ) : null}
      <ConfirmDialog
        visible={confirmAction !== null}
        title={confirmAction === 'cancelDownload' ? t('downloads.cancelConfirmTitle') : confirmAction === 'removeFromPlaylist' ? t('actions.removeTrackTitle') : t('downloads.removeConfirmTitle')}
        message={confirmAction === 'cancelDownload' ? t('downloads.cancelConfirmMessage') : confirmAction === 'removeFromPlaylist' ? t('actions.removeTrackMessage') : t('downloads.removeConfirmMessage')}
        cancelLabel={t('common.cancel')}
        confirmLabel={confirmAction === 'cancelDownload' ? t('downloads.cancel') : t('common.confirm')}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmDestructiveAction}
      />
    </>
  );
}

function normalizeTitle(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toLocaleLowerCase();
}

const s = StyleSheet.create({
  actionList: { flexShrink: 1, marginTop: spacing.sm },
  progressTrack: { width: 64, height: 4, borderRadius: 2, backgroundColor: '#333333', overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#C6E27A' },
});
