import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PlaylistSummary, Track } from '@/types';
import { getDb, playlistsRepo } from '@/database';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';

export function AddTracksToPlaylistModal({ tracks, onClose }: {
  tracks: Track[];
  onClose: () => void;
}) {
  useTranslation();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getDb()
      .then((db) => playlistsRepo.listPlaylists(db))
      .then((items) => {
        if (active) setPlaylists(items);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : t('common.error'));
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => { active = false; };
  }, []);

  const addToPlaylist = async (playlist: PlaylistSummary) => {
    if (addingId !== null) return;
    setAddingId(playlist.id);
    setError(null);
    try {
      const added = await playlistsRepo.addTracksToPlaylist(await getDb(), playlist.id, tracks);
      setResult(t('artist.tracksAdded', { added, total: tracks.length, playlist: playlist.name }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setAddingId(null);
    }
  };

  const busy = addingId !== null;
  const close = () => {
    if (!busy) onClose();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <Pressable style={s.backdrop} onPress={close} />
      <View style={s.sheet}>
        <Text style={s.title}>{t('artist.addAllTracks')}</Text>
        <Text style={s.hint}>{t('artist.choosePlaylist')}</Text>

        {result ? (
          <Text accessibilityRole="alert" style={s.result}>{result}</Text>
        ) : (
          <ScrollView style={s.list}>
            {!loaded ? <Text style={s.hint}>{t('common.loading')}</Text> : null}
            {loaded && playlists.length === 0 ? <Text style={s.hint}>{t('actions.noPlaylists')}</Text> : null}
            {playlists.map((playlist) => (
              <Pressable
                key={playlist.id}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void addToPlaylist(playlist)}
                style={({ pressed }) => [s.row, (pressed || busy) && s.pressed]}
              >
                <Text numberOfLines={1} style={s.rowText}>{playlist.name}</Text>
                {addingId === playlist.id
                  ? <Text style={s.rowAction}>{t('common.loading')}</Text>
                  : <Icon name="chevron-forward" size={20} color={colors.textMuted} />}
              </Pressable>
            ))}
          </ScrollView>
        )}

        {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}

        <View style={s.actions}>
          <Button label={result ? t('common.close') : t('common.cancel')} variant="secondary" onPress={close} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },
  sheet: { marginTop: 'auto', backgroundColor: colors.surfaceAlt, padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  title: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: font.md },
  list: { maxHeight: 320 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md },
  rowText: { flex: 1, color: colors.text, fontSize: font.lg },
  rowAction: { color: colors.textMuted, fontSize: font.sm },
  result: { color: colors.text, fontSize: font.md, lineHeight: 22 },
  error: { color: colors.danger, fontSize: font.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  pressed: { opacity: 0.7 },
});
