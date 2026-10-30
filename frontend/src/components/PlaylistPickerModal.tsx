import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PlaylistSummary, Track } from '@/types';
import { favoritesRepo, getDb, playlistsRepo } from '@/database';
import { bumpFavoritesVersion } from '@/features/favorites/favoriteFeedback';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Cover } from './Cover';
import { cleanupUnreferencedLocalAudio } from '@/storage/localAudioCleanup';
import { BottomSheet } from './Overlays';
import { SheetDivider, SheetHeader, SheetRow, showToast } from './overlay';

const FAVORITES = -1;

export function PlaylistPickerModal({ track, onCancel, onConfirm, onCreatePlaylist, title, subtitle, artworkUrl, onBack }: {
  track: Track;
  onCancel: () => void;
  onConfirm: () => void;
  onCreatePlaylist: () => void;
  title?: string;
  subtitle?: string;
  artworkUrl?: string | null;
  onBack?: () => void;
}) {
  useTranslation();
  const [lists, setLists] = useState<PlaylistSummary[]>([]);
  const [initial, setInitial] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const filteredLists = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return lists.filter((playlist) => playlist.name.toLocaleLowerCase().includes(normalizedQuery));
  }, [lists, query]);

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
    })().catch((error: unknown) => {
      if (!alive) return;
      setLoaded(true);
      showToast(error instanceof Error ? error.message : t('common.error'), { icon: 'warning-outline' });
    });
    return () => { alive = false; };
  }, [track.id]);

  const toggle = (id: number) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = async () => {
    setBusy(true);
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
      showToast(t('favorite.changesSaved'));
      onConfirm();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('common.error'), { icon: 'warning-outline' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible
      onClose={onCancel}
      busy={busy}
      closeOnBackdrop={!busy}
      contentStyle={s.sheet}
    >
      <View style={s.content}>
        <SheetHeader
          title={title ?? t('favorite.pickerTitle')}
          subtitle={subtitle ?? t('favorite.pickerHint')}
          artworkUrl={artworkUrl}
          onBack={busy ? undefined : onBack}
          onClose={busy || onBack ? undefined : onCancel}
        />
        <Button
          icon="add"
          label={t('library.newPlaylist')}
          variant="secondary"
          onPress={onCreatePlaylist}
          disabled={busy}
        />
        {lists.length > 8 ? (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textMuted}
            style={s.search}
          />
        ) : null}
        <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
          <SheetRow
            role="checkbox"
            label={t('favorite.likedSongs')}
            icon="heart"
            selected={selected.has(FAVORITES)}
            disabled={busy}
            onPress={() => toggle(FAVORITES)}
          />
          <SheetDivider />
          {!loaded ? <ActivityIndicator color="#C6E27A" style={s.loading} /> : null}
          {loaded && lists.length === 0 ? <Text style={s.hint}>{t('actions.noPlaylists')}</Text> : null}
          {loaded && lists.length > 0 && filteredLists.length === 0 ? (
            <Text style={s.hint}>{t('search.noResults', { query })}</Text>
          ) : null}
          {filteredLists.map((playlist) => (
            <SheetRow
              key={playlist.id}
              role="checkbox"
              label={playlist.name}
              subtitle={t('library.playlistMeta', { count: playlist.trackCount })}
              leading={<Cover uri={playlist.customCoverUrl ?? playlist.coverUrl} size={48} radius={8} seed={playlist.name} icon="list" />}
              selected={selected.has(playlist.id)}
              disabled={busy}
              onPress={() => toggle(playlist.id)}
            />
          ))}
        </ScrollView>
        <View style={s.footer}>
          <Button label={t('common.cancel')} variant="secondary" onPress={onCancel} disabled={busy} style={s.footerButton} />
          <Button label={t('common.confirm')} onPress={() => void confirm()} loading={busy} style={s.footerButton} />
        </View>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  sheet: { gap: 0 },
  content: { gap: spacing.md },
  search: { height: 44, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: '#242424', borderRadius: radius.md },
  list: { maxHeight: 420, flexShrink: 1 },
  loading: { paddingVertical: spacing.lg },
  hint: { color: colors.textMuted, fontSize: font.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  footer: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.sm },
  footerButton: { flex: 1, minHeight: 48, borderRadius: 8 },
});
