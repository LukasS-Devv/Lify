import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlaylistSummary, Track } from '@/types';
import { favoritesRepo, getDb, playlistsRepo } from '@/database';
import { bumpFavoritesVersion } from '@/features/favorites/favoriteFeedback';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { cleanupUnreferencedLocalAudio } from '@/storage/localAudioCleanup';
import { PickerModal } from './Overlays';

/** Id reservado para a linha "Favoritos" dentro do conjunto de seleção. */
const FAVORITES = -1;

/** Marca/desmarca em quais playlists (e nos favoritos) a faixa deve estar. Só grava ao confirmar. */
export function PlaylistPickerModal({ track, onCancel, onConfirm, onCreatePlaylist }: {
  track: Track; onCancel: () => void; onConfirm: () => void; onCreatePlaylist: () => void;
}) {
  useTranslation();
  const [lists, setLists] = useState<PlaylistSummary[]>([]);
  const [initial, setInitial] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const filteredLists = useMemo(
    () => lists.filter((playlist) => playlist.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
    [lists, query],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const db = await getDb();
      const [all, ids, liked] = await Promise.all([
        playlistsRepo.listPlaylists(db),
        playlistsRepo.playlistIdsContaining(db, track.id),
        favoritesRepo.isFavorite(db, track.id),
      ]);
      if (!alive) return;
      const current = new Set(ids);
      if (liked) current.add(FAVORITES);
      setLists(all);
      setInitial(current);
      setSelected(new Set(current));
      setLoaded(true);
    })().catch((e: unknown) => {
      if (alive) setError(e instanceof Error ? e.message : t('common.error'));
    });
    return () => { alive = false; };
  }, [track.id]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const db = await getDb();
      for (const id of Array.from(selected)) {
        if (id !== FAVORITES && !initial.has(id)) await playlistsRepo.addTrackToPlaylist(db, id, track);
      }
      for (const id of Array.from(initial)) {
        if (id !== FAVORITES && !selected.has(id)) await playlistsRepo.removeTrackFromPlaylist(db, id, track.id);
      }
      if (selected.has(FAVORITES) !== initial.has(FAVORITES)) {
        await favoritesRepo.toggleFavorite(db, track);
        bumpFavoritesVersion();
      }
      await cleanupUnreferencedLocalAudio();
      onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PickerModal
      visible
      onClose={onCancel}
      busy={busy}
      title={t('favorite.pickerTitle')}
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder={t('search.placeholder')}
      footer={(
        <View style={s.footer}>
          <Button icon="add" label={t('library.newPlaylist')} variant="secondary" onPress={onCreatePlaylist} disabled={busy} />
          <View style={s.actions}>
            <Button label={t('common.cancel')} variant="secondary" onPress={onCancel} disabled={busy} />
            <Button label={t('common.confirm')} onPress={() => void confirm()} loading={busy} />
          </View>
        </View>
      )}
    >
        <Text style={s.hint}>{t('favorite.pickerHint')}</Text>

        <View>
          <CheckRow label={t('favorite.likedSongs')} checked={selected.has(FAVORITES)} onPress={() => toggle(FAVORITES)} />
          {!loaded ? <Text style={s.hint}>{t('common.loading')}</Text> : null}
          {loaded && lists.length === 0 ? <Text style={s.hint}>{t('actions.noPlaylists')}</Text> : null}
          {loaded && lists.length > 0 && filteredLists.length === 0 ? <Text style={s.hint}>{t('search.noResults', { query })}</Text> : null}
          {filteredLists.map((p) => (
            <CheckRow key={p.id} label={p.name} checked={selected.has(p.id)} onPress={() => toggle(p.id)} />
          ))}
        </View>

        {error ? <Text style={s.err}>{error}</Text> : null}
    </PickerModal>
  );
}

function CheckRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={s.row}>
      <Icon name={checked ? 'checkbox' : 'square-outline'} size={18} color={checked ? colors.accent : colors.textMuted} />
      <Text numberOfLines={1} style={s.rowText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: font.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 40, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  rowText: { flex: 1, color: colors.text, fontSize: font.md },
  err: { color: colors.danger },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  footer: { gap: spacing.sm },
});
