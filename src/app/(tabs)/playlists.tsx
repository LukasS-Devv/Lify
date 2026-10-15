import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, EmptyState, Screen } from '@/components';
import { usePlaylists } from '@/features/playlists/usePlaylists';
import { colors, font, layout, radius, spacing } from '@/theme/tokens';

export default function Playlists() {
  const router = useRouter();
  const { data, loading, error, create } = usePlaylists();
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    try {
      const id = await create(name);
      setName(''); setFormError(null);
      router.push({ pathname: '/playlist/[id]', params: { id: String(id) } });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao criar.');
    }
  };

  return (
    <Screen title="Playlists">
      <View style={s.form}>
        <TextInput
          value={name} onChangeText={setName} onSubmitEditing={submit}
          placeholder="Nome da nova playlist" placeholderTextColor={colors.textMuted} style={s.input}
        />
        <Button label="Criar" onPress={submit} />
      </View>
      {formError || error ? <Text style={s.err}>{formError ?? error}</Text> : null}
      <FlatList
        data={data}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: String(item.id) } })}
            style={s.row}
          >
            {item.coverUrl
              ? <Image source={{ uri: item.coverUrl }} style={s.art} />
              : <View style={[s.art, s.artEmpty]}><Text style={{ color: colors.textMuted }}>♪</Text></View>}
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={s.name}>{item.name}</Text>
              <Text style={s.sub}>{item.trackCount} {item.trackCount === 1 ? 'faixa' : 'faixas'}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState loading={loading} message={loading ? 'Carregando…' : 'Crie sua primeira playlist acima.'} />}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  form: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'center' },
  input: { flex: 1, backgroundColor: colors.surfaceAlt, color: colors.text, fontSize: font.lg, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md },
  err: { color: colors.danger, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  art: { width: layout.artwork, height: layout.artwork, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  artEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: font.lg, fontWeight: '600' },
  sub: { color: colors.textMuted, fontSize: font.md },
});
