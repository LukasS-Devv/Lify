import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgress } from 'react-native-track-player';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState } from '@/components';
import { usePlayer } from '@/features/player/usePlayer';
import {
  next, previous, removeFromQueue, seekTo, setRepeat, shuffleUpcoming, skipTo, togglePlay,
} from '@/services/audio/controller';
import type { RepeatMode } from '@/types';
import { formatDuration } from '@/utils/track';
import { colors, font, radius, spacing } from '@/theme/tokens';

const REPEAT_NEXT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };
const REPEAT_LABEL: Record<RepeatMode, string> = { off: 'Repetir: não', all: 'Repetir: fila', one: 'Repetir: faixa' };

export default function PlayerScreen() {
  const router = useRouter();
  const { track, status, error, queue, repeat, favorite, toggleFavorite } = usePlayer();
  const { position, duration } = useProgress(500);
  const [barW, setBarW] = useState(0);

  if (!track) {
    return (
      <SafeAreaView style={s.root}>
        <EmptyState message="Nada tocando agora." />
        <Button label="Fechar" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const total = duration || track.durationSec || 0;
  const playing = status === 'playing';
  const upcoming = queue.items.map((t, i) => ({ t, i })).filter(({ i }) => i > queue.index);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.top}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={s.link}>Fechar ▾</Text></Pressable>
        <Pressable onPress={toggleFavorite} hitSlop={12}>
          <Text style={[s.link, favorite && { color: colors.accent }]}>{favorite ? '♥ Favorita' : '♡ Favoritar'}</Text>
        </Pressable>
      </View>

      <Image source={{ uri: track.artworkUrl }} style={s.art} />
      <Text numberOfLines={2} style={s.title}>{track.title}</Text>
      <Text numberOfLines={1} style={s.artist}>{track.artist}</Text>
      {status === 'error' ? <Text style={s.err}>{error ?? 'Erro ao reproduzir.'}</Text> : null}
      {status === 'loading' ? <Text style={s.artist}>Carregando…</Text> : null}

      {/* Barra de progresso por toque (seek). O slider arrastável fica para a fase visual. */}
      <View style={s.seekRow}>
        <Text style={s.time}>{formatDuration(position)}</Text>
        <Pressable
          style={s.bar}
          onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
          onPress={(e) => { if (barW && total) void seekTo((e.nativeEvent.locationX / barW) * total); }}
        >
          <View style={[s.barFill, { width: `${total > 0 ? Math.min(100, (position / total) * 100) : 0}%` }]} />
        </Pressable>
        <Text style={s.time}>{formatDuration(total)}</Text>
      </View>

      <View style={s.controls}>
        <Ctl label="⏮" onPress={previous} />
        <Ctl label={playing ? '❚❚' : '▶'} big onPress={togglePlay} />
        <Ctl label="⏭" onPress={() => next(true)} />
      </View>
      <View style={s.controls}>
        <Button variant="secondary" label={REPEAT_LABEL[repeat]} onPress={() => setRepeat(REPEAT_NEXT[repeat])} />
        <Button variant="secondary" label="Embaralhar fila" onPress={shuffleUpcoming} />
      </View>

      <Text style={s.section}>A seguir ({upcoming.length})</Text>
      <FlatList
        data={upcoming}
        keyExtractor={({ t, i }) => `${t.id}-${i}`}
        renderItem={({ item: { t, i } }) => (
          <View style={s.qrow}>
            <Pressable style={{ flex: 1 }} onPress={() => skipTo(i)}>
              <Text numberOfLines={1} style={s.qtitle}>{t.title}</Text>
              <Text numberOfLines={1} style={s.qsub}>{t.artist}</Text>
            </Pressable>
            <Pressable hitSlop={10} onPress={() => removeFromQueue(i)}><Text style={s.qsub}>✕</Text></Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={s.qsub}>Fila vazia.</Text>}
      />
    </SafeAreaView>
  );
}

function Ctl({ label, onPress, big }: { label: string; onPress: () => void; big?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[s.ctl, big && s.ctlBig]}>
      <Text style={[s.ctlText, big && { color: colors.accentText }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  link: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  art: { width: '100%', aspectRatio: 1, maxHeight: 280, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, resizeMode: 'cover' },
  title: { color: colors.text, fontSize: font.xl, fontWeight: '800', marginTop: spacing.md },
  artist: { color: colors.textMuted, fontSize: font.lg },
  err: { color: colors.danger, marginTop: spacing.sm },
  seekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  bar: { flex: 1, height: 20, justifyContent: 'center', backgroundColor: 'transparent' },
  barFill: { height: 4, backgroundColor: colors.accent, borderRadius: 2 },
  time: { color: colors.textMuted, fontSize: font.sm, width: 44, textAlign: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  ctl: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  ctlBig: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent },
  ctlText: { color: colors.text, fontSize: 22 },
  section: { color: colors.text, fontSize: font.lg, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  qrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  qtitle: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  qsub: { color: colors.textMuted, fontSize: font.sm },
});
