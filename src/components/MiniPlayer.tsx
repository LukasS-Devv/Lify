import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgress } from 'react-native-track-player';
import { selectCurrentTrack, usePlayerStore } from '@/services/audio/store';
import { next, togglePlay } from '@/services/audio/controller';
import { colors, font, layout, radius, spacing } from '@/theme/tokens';

export function MiniPlayer() {
  const router = useRouter();
  const track = usePlayerStore(selectCurrentTrack);
  const status = usePlayerStore((s) => s.status);
  const { position, duration } = useProgress(1000);
  if (!track) return null;

  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const playing = status === 'playing';

  return (
    <Pressable onPress={() => router.push('/player')} style={s.box}>
      <Image source={{ uri: track.artworkUrl }} style={s.art} />
      <View style={s.info}>
        <Text numberOfLines={1} style={s.title}>{track.title}</Text>
        <Text numberOfLines={1} style={s.sub}>
          {status === 'loading' ? 'Carregando…' : status === 'error' ? 'Erro — toque para tentar de novo' : track.artist}
        </Text>
      </View>
      <Pressable hitSlop={10} onPress={() => togglePlay()} accessibilityLabel={playing ? 'Pausar' : 'Tocar'}>
        <Text style={s.btn}>{playing ? '❚❚' : '▶'}</Text>
      </Pressable>
      <Pressable hitSlop={10} onPress={() => next(true)} accessibilityLabel="Próxima">
        <Text style={s.btn}>⏭</Text>
      </Pressable>
      <View style={[s.progress, { width: `${pct}%` }]} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: {
    height: layout.miniPlayerHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    marginHorizontal: spacing.sm, marginBottom: spacing.xs, overflow: 'hidden',
  },
  art: { width: 40, height: 40, borderRadius: radius.sm },
  info: { flex: 1 },
  title: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: font.sm },
  btn: { color: colors.text, fontSize: 20, paddingHorizontal: spacing.xs },
  progress: { position: 'absolute', left: 0, bottom: 0, height: 2, backgroundColor: colors.accent },
});
