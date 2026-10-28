import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { PlaylistSummary, Track } from '@/types';
import { getDb, playlistsRepo } from '@/database';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { PickerModal } from './Overlays';

export function AddTracksToPlaylistModal({ tracks, onClose }: {
  tracks: Track[];
  onClose: () => void;
}) {
  useTranslation();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    <PickerModal
      visible
      onClose={close}
      busy={busy}
      title={t('artist.addAllTracks')}
      searchValue={query}
      onSearchChange={setQuery}
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
          />
          <Button label={result ? t('common.close') : t('common.cancel')} variant="secondary" onPress={close} disabled={busy} />
        </View>
      )}
    >
        <Text style={s.hint}>{t('artist.choosePlaylist')}</Text>

        {result ? (
          <Text accessibilityRole="alert" style={s.result}>{result}</Text>
        ) : (
          <View style={s.list}>
            {!loaded ? <Text style={s.hint}>{t('common.loading')}</Text> : null}
            {loaded && playlists.length === 0 ? <Text style={s.hint}>{t('actions.noPlaylists')}</Text> : null}
            {loaded && playlists.length > 0 && filteredPlaylists.length === 0 ? <Text style={s.hint}>{t('search.noResults', { query })}</Text> : null}
            {filteredPlaylists.map((playlist) => (
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
          </View>
        )}

        {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    </PickerModal>
  );
}

const s = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: font.md },
  list: { maxHeight: 360 },
  row: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  rowText: { flex: 1, color: colors.text, fontSize: font.md },
  rowAction: { color: colors.textMuted, fontSize: font.sm },
  result: { color: colors.text, fontSize: font.md, lineHeight: 22 },
  error: { color: colors.danger, fontSize: font.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  footer: { gap: spacing.sm },
  pressed: { opacity: 0.7 },
});
