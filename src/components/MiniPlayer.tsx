import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useProgress } from 'react-native-track-player';
import { usePlayer } from '@/features/player/usePlayer';
import { next, togglePlay } from '@/services/audio/controller';
import { t, useTranslation } from '@/i18n';
import { tintFor } from '@/utils/color';
import { colors, font, layout, radius, shadow, spacing } from '@/theme/tokens';
import { Cover } from './Cover';
import { IconButton } from './IconButton';

/** Cartão flutuante com a faixa atual; toque abre o player em tela cheia. */
export function MiniPlayer() {
  useTranslation();
  const router = useRouter();
  const { track, status, favorite, toggleFavorite } = usePlayer();
  const { position, duration } = useProgress(1000);
  if (!track) return null;

  const total = duration || track.durationSec || 0;
  const pct = total > 0 ? Math.min(100, (position / total) * 100) : 0;
  const playing = status === 'playing';
  const busy = status === 'loading' || status === 'buffering';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('player.nowPlaying')}
      onPress={() => router.push('/player')}
      style={[s.box, { backgroundColor: tintFor(track.id, 0.2, 0.45) }]}
    >
      <Cover uri={track.artworkUrl} size={44} />
      <View style={s.info}>
        <Text numberOfLines={1} style={s.title}>{track.title}</Text>
        <Text numberOfLines={1} style={[s.sub, status === 'error' && { color: colors.danger }]}>
          {status === 'loading' ? t('player.loading') : status === 'error' ? t('player.miniError') : track.artist}
        </Text>
      </View>
      <IconButton icon={favorite ? 'heart' : 'heart-outline'} label={favorite ? t('player.unlike') : t('player.like')} size={22}
        color={favorite ? colors.accent : colors.text} onPress={toggleFavorite} />
      {busy ? (
        <View style={s.spinner}><ActivityIndicator color={colors.text} /></View>
      ) : (
        <IconButton icon={playing ? 'pause' : 'play'} label={playing ? t('player.pause') : t('player.play')} size={28} onPress={() => void togglePlay()} />
      )}
      <IconButton icon="play-skip-forward" label={t('player.next')} size={22} onPress={() => void next(true)} />
      <View style={s.track}><View style={[s.progress, { width: `${pct}%` }]} /></View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: {
    height: layout.miniPlayerHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.sm, borderRadius: radius.lg, marginHorizontal: spacing.sm, marginBottom: spacing.xs,
    overflow: 'hidden', ...shadow.card,
  },
  info: { flex: 1, marginLeft: spacing.xs },
  title: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: font.sm },
  spinner: { width: 40, alignItems: 'center' },
  track: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: 4, height: 2, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 1 },
  progress: { height: 2, backgroundColor: colors.accent, borderRadius: 1 },
});
