import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState, Screen, TrackActionsModal, TrackRow } from '@/components';
import { useFavorites, useHistory } from '@/features/library/useLibrary';
import { playQueue } from '@/services/audio/controller';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';
import type { Track } from '@/types';
import { colors, font, radius, spacing } from '@/theme/tokens';

type Tab = 'favorites' | 'history';

export default function Library() {
  const [tab, setTab] = useState<Tab>('favorites');
  const fav = useFavorites();
  const hist = useHistory(200);
  const current = usePlayerStore(selectCurrentTrack);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  const tracks = tab === 'favorites' ? fav.data : hist.data.map((h) => h.track);
  const loading = tab === 'favorites' ? fav.loading : hist.loading;

  return (
    <Screen title="Biblioteca">
      <View style={s.tabs}>
        {(['favorites', 'history'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.chip, tab === t && s.chipOn]}>
            <Text style={[s.chipText, tab === t && { color: colors.accentText }]}>
              {t === 'favorites' ? 'Favoritas' : 'Histórico'}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={tracks}
        keyExtractor={(t, i) => `${t.id}-${i}`}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            active={item.id === current?.id}
            onPress={() => playQueue(tracks, index)}
            onMore={() => setMenuTrack(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState loading={loading} message={loading ? 'Carregando…' : tab === 'favorites' ? 'Você ainda não favoritou nada.' : 'O histórico está vazio.'} />
        }
      />
      <TrackActionsModal track={menuTrack} onClose={() => { setMenuTrack(null); void fav.reload(); }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: font.md, fontWeight: '600' },
});
