import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PlaylistSummary, Track } from '@/types';
import { favoritesRepo, getDb, playlistsRepo } from '@/database';
import { bumpFavoritesVersion } from '@/features/favorites/favoriteFeedback';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { cleanupUnreferencedLocalAudio } from '@/storage/localAudioCleanup';

/** Id reservado para a linha "Favoritos" dentro do conjunto de seleção. */
const FAVORITES = -1;

/** Marca/desmarca em quais playlists (e nos favoritos) a faixa deve estar. Só grava ao confirmar. */
export function PlaylistPickerModal({ track, onCancel, onConfirm }: {
  track: Track; onCancel: () => void; onConfirm: () => void;
}) {
  useTranslation();
  const [lists, setLists] = useState<PlaylistSummary[]>([]);
  const [initial, setInitial] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <Pressable style={s.backdrop} onPress={onCancel} />
      <View style={s.sheet}>
        <Text style={s.title}>{t('favorite.pickerTitle')}</Text>
        <Text style={s.hint}>{t('favorite.pickerHint')}</Text>

        <ScrollView style={{ maxHeight: 320 }}>
          <CheckRow label={t('favorite.likedSongs')} checked={selected.has(FAVORITES)} onPress={() => toggle(FAVORITES)} />
          {loaded && lists.length === 0 ? <Text style={s.hint}>{t('actions.noPlaylists')}</Text> : null}
          {lists.map((p) => (
            <CheckRow key={p.id} label={p.name} checked={selected.has(p.id)} onPress={() => toggle(p.id)} />
          ))}
        </ScrollView>

        {error ? <Text style={s.err}>{error}</Text> : null}

        <View style={s.actions}>
          <Button label={t('common.cancel')} variant="secondary" onPress={onCancel} />
          <Button label={t('common.confirm')} onPress={() => void confirm()} loading={busy} />
        </View>
      </View>
    </Modal>
  );
}

function CheckRow({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={s.row}>
      <Icon name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? colors.accent : colors.textMuted} />
      <Text numberOfLines={1} style={s.rowText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },
  sheet: { marginTop: 'auto', backgroundColor: colors.surfaceAlt, padding: spacing.lg,paddingBottom: spacing.xl*2 ,gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  title: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: font.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md },
  rowText: { flex: 1, color: colors.text, fontSize: font.lg },
  err: { color: colors.danger },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
