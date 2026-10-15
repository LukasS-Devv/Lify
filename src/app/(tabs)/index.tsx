import { FlatList, Text } from 'react-native';
import { EmptyState, Screen, TrackRow } from '@/components';
import { useHistory } from '@/features/library/useLibrary';
import { playQueue } from '@/services/audio/controller';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';
import { colors, font, spacing } from '@/theme/tokens';

export default function Home() {
  const { data, loading } = useHistory(30);
  const current = usePlayerStore(selectCurrentTrack);
  const tracks = data.map((h) => h.track);

  return (
    <Screen title="Lify">
      <Text style={{ color: colors.text, fontSize: font.xl, fontWeight: '700', paddingHorizontal: spacing.md }}>
        Tocadas recentemente
      </Text>
      <FlatList
        data={tracks}
        keyExtractor={(t, i) => `${t.id}-${i}`}
        renderItem={({ item, index }) => (
          <TrackRow track={item} active={item.id === current?.id} onPress={() => playQueue(tracks, index)} />
        )}
        ListEmptyComponent={
          <EmptyState loading={loading} message={loading ? 'Carregando…' : 'Nada por aqui ainda. Use a aba Buscar para tocar sua primeira música.'} />
        }
      />
    </Screen>
  );
}
