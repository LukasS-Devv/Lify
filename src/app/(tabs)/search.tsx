import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState, Screen, TrackActionsModal, TrackRow } from '@/components';
import { useSearch } from '@/features/search/useSearch';
import { playQueue } from '@/services/audio/controller';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';
import type { Track } from '@/types';
import { colors, font, radius, spacing } from '@/theme/tokens';

export default function Search() {
  const { query, setQuery, results, suggestions, loading, error, searched, submit } = useSearch();
  const current = usePlayerStore(selectCurrentTrack);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);

  return (
    <Screen title="Buscar">
      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => submit()}
        placeholder="Artista, música…"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        style={s.input}
      />
      {suggestions.length > 0 ? (
        <View>
          {suggestions.map((sug) => (
            <Pressable key={sug} onPress={() => submit(sug)} style={s.sug}>
              <Text style={s.sugText}>{sug}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(t) => t.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TrackRow
              track={item}
              active={item.id === current?.id}
              onPress={() => playQueue(results, index)}
              onMore={() => setMenuTrack(item)}
            />
          )}
          ListEmptyComponent={
            loading ? <EmptyState loading message="Buscando…" />
            : error ? <EmptyState message={error} />
            : <EmptyState message={searched ? 'Nenhum resultado.' : 'Digite algo para começar.'} />
          }
        />
      )}
      <TrackActionsModal track={menuTrack} onClose={() => setMenuTrack(null)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceAlt, color: colors.text, fontSize: font.lg,
    marginHorizontal: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.md,
  },
  sug: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  sugText: { color: colors.text, fontSize: font.lg },
});
