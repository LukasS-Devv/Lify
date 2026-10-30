import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { PlaylistSummary, Track } from '@/types';
import { getDb, playlistsRepo } from '@/database';
import { t, useTranslation } from '@/i18n';
import { colors, font, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Cover } from './Cover';
import { PickerModal } from './Overlays';
import { SheetRow, showToast } from './overlay';

export function AddTracksToPlaylistModal({ tracks, onClose }: {
  tracks: Track[];
  onClose: () => void;
}) {
  useTranslation();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const filteredPlaylists = useMemo(
    () => playlists.filter((playlist) => playlist.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
    [playlists, query],
  );

  useEffect(() => {
    let active = true;
    void getDb()
      .then((db) => playlistsRepo.listPlaylists(db))
      .then((items) => {
        if (active) setPlaylists(items);
      })
      .catch((e: unknown) => {
        if (active) showToast(e instanceof Error ? e.message : t('common.error'), { icon: 'warning-outline' });
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => { active = false; };
  }, []);

  const addToPlaylist = async (playlist: PlaylistSummary) => {
    if (addingId !== null) return;
    setAddingId(playlist.id);
    try {
      const added = await playlistsRepo.addTracksToPlaylist(await getDb(), playlist.id, tracks);
      showToast(t('artist.tracksAdded', { added, total: tracks.length, playlist: playlist.name }));
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('common.error'), { icon: 'warning-outline' });
    } finally {
      setAddingId(null);
    }
  };

  const busy = addingId !== null;
  const close = () => {
    if (!busy) onClose();
  };

  return (
    <PickerModal
      visible
      onClose={close}
      busy={busy}
      title={t('artist.addAllTracks')}
      searchValue={playlists.length > 8 ? query : undefined}
      onSearchChange={playlists.length > 8 ? setQuery : undefined}
      searchPlaceholder={t('search.placeholder')}
      footer={(
        <View style={s.footer}>
          <Button
            icon="add"
            variant="secondary"
            label={t('library.newPlaylist')}
            onPress={() => {
              close();
              router.push('/playlists');
            }}
            disabled={busy}
            style={s.footerButton}
          />
          <Button label={t('common.cancel')} variant="secondary" onPress={close} disabled={busy} style={s.footerButton} />
        </View>
      )}
    >
        <Text style={s.hint}>{t('artist.choosePlaylist')}</Text>

        <View style={s.list}>
          {!loaded ? <ActivityIndicator color="#C6E27A" style={s.loading} /> : null}
          {loaded && playlists.length === 0 ? <Text style={s.hint}>{t('actions.noPlaylists')}</Text> : null}
          {loaded && playlists.length > 0 && filteredPlaylists.length === 0 ? <Text style={s.hint}>{t('search.noResults', { query })}</Text> : null}
          {filteredPlaylists.map((playlist) => (
            <SheetRow
              key={playlist.id}
              label={playlist.name}
              subtitle={t('library.playlistMeta', { count: playlist.trackCount })}
              leading={<Cover uri={playlist.customCoverUrl ?? playlist.coverUrl} size={48} radius={8} seed={playlist.name} icon="list" />}
              right={addingId === playlist.id ? <ActivityIndicator size="small" color="#C6E27A" /> : undefined}
              disabled={busy}
              onPress={() => void addToPlaylist(playlist)}
            />
          ))}
        </View>
    </PickerModal>
  );
}

const s = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: font.md },
  list: { maxHeight: 360, flexShrink: 1 },
  loading: { paddingVertical: spacing.lg },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  footer: { gap: spacing.md },
  footerButton: { width: '100%', minHeight: 48, borderRadius: 8 },
});
