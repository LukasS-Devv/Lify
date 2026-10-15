import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, EmptyState, TrackActionsModal, TrackRow } from '@/components';
import { usePlaylistDetail } from '@/features/playlists/usePlaylists';
import { addToQueueEnd, playQueue } from '@/services/audio/controller';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';
import type { Track } from '@/types';
import { colors, font, radius, spacing } from '@/theme/tokens';

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlistId = Number(id);
  const router = useRouter();
  const { data, loading, rename, remove, removeTrack, move } = usePlaylistDetail(playlistId);
  const current = usePlayerStore(selectCurrentTrack);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const { playlist, tracks } = data;

  const confirmDelete = () =>
    Alert.alert('Excluir playlist', `Excluir "${playlist?.name}"? As músicas continuam no app.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { await remove(); router.back(); } },
    ]);

  if (!loading && !playlist) {
    return <EmptyState message="Playlist não encontrada." />;
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ title: playlist?.name ?? 'Playlist' }} />
      <View style={s.head}>
        {editing ? (
          <TextInput
            value={name} onChangeText={setName} autoFocus style={s.input}
            onSubmitEditing={async () => { try { await rename(name); setEditing(false); } catch (e) { Alert.alert('Erro', e instanceof Error ? e.message : ''); } }}
          />
        ) : (
          <Text style={s.title}>{playlist?.name}</Text>
        )}
        <Text style={s.sub}>{tracks.length} faixas</Text>
        <View style={s.actions}>
          <Button label="Tocar" disabled={!tracks.length} onPress={() => playQueue(tracks, 0)} />
          <Button label="Add à fila" variant="secondary" disabled={!tracks.length} onPress={() => addToQueueEnd(tracks)} />
          <Button label={editing ? 'Cancelar' : 'Renomear'} variant="secondary" onPress={() => { setName(playlist?.name ?? ''); setEditing((e) => !e); }} />
          <Button label="Excluir" variant="danger" onPress={confirmDelete} />
        </View>
      </View>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        renderItem={({ item, index }) => (
          <View>
            <TrackRow track={item} active={item.id === current?.id} onPress={() => playQueue(tracks, index)} onMore={() => setMenuTrack(item)} />
            <View style={s.reorder}>
              <Button label="↑" variant="secondary" disabled={index === 0} onPress={() => move(index, index - 1)} />
              <Button label="↓" variant="secondary" disabled={index === tracks.length - 1} onPress={() => move(index, index + 1)} />
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState loading={loading} message={loading ? 'Carregando…' : 'Playlist vazia. Use "⋯ → Adicionar a uma playlist" em qualquer música.'} />}
      />
      <TrackActionsModal track={menuTrack} onClose={() => setMenuTrack(null)} onRemoveFromPlaylist={removeTrack} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { padding: spacing.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: font.xxl, fontWeight: '800' },
  sub: { color: colors.textMuted, fontSize: font.md },
  input: { backgroundColor: colors.surfaceAlt, color: colors.text, fontSize: font.xl, padding: spacing.sm, borderRadius: radius.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reorder: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, justifyContent: 'flex-end' },
});
