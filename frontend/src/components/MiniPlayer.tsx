import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useProgress } from '@/services/audio/useProgress';
import { usePlayer } from '@/features/player/usePlayer';
import { next, seekTo, togglePlay } from '@/services/audio/controller';
import { t, useTranslation } from '@/i18n';
import { tintFor } from '@/utils/color';
import { colors, font, layout, radius, shadow, spacing } from '@/theme/tokens';
import { Cover } from './Cover';
import { IconButton } from './IconButton';

/** Cartão flutuante com a faixa atual; toque abre o player em tela cheia. */
export function MiniPlayer({ desktop = false }: { desktop?: boolean }) {
  useTranslation();
  const router = useRouter();
  const { track, status, favorite, toggleFavorite } = usePlayer();
  const { position, duration } = useProgress(1000);
  const [draggingPosition, setDraggingPosition] = useState<number | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
  }, []);
  useEffect(() => {
    setDraggingPosition(null);
  }, [track?.id]);
  if (!track) return null;

  const total = duration || track.durationSec || 0;
  const shownPosition = draggingPosition ?? position;
  const playing = status === 'playing';
  const busy = status === 'loading' || status === 'buffering';

  return (
    <View style={[s.slot, desktop && s.desktopSlot]}>
      <View style={[s.box, desktop && s.desktopBox, { backgroundColor: desktop ? colors.surface : tintFor(track.id, 0.2, 0.45) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('player.nowPlaying')}
          onPress={() => router.push('/player')}
          style={s.trackInfo}
        >
          <Cover uri={track.artworkUrl} size={44} />
          <View style={s.info}>
            <Text numberOfLines={1} style={s.title}>{track.title}</Text>
            <Text numberOfLines={1} style={[s.sub, status === 'error' && { color: colors.danger }]}>
              {status === 'loading' ? t('player.loading') : status === 'error' ? t('player.miniError') : track.artist}
            </Text>
          </View>
        </Pressable>
        <IconButton icon={favorite ? 'heart' : 'heart-outline'} label={favorite ? t('player.unlike') : t('player.like')} size={22}
          color={favorite ? colors.accent : colors.text} onPress={toggleFavorite} />
        {busy ? (
          <View style={s.spinner}><ActivityIndicator color={colors.text} /></View>
        ) : (
          <IconButton icon={playing ? 'pause' : 'play'} label={playing ? t('player.pause') : t('player.play')} size={28} onPress={() => void togglePlay()} />
        )}
        <IconButton icon="play-skip-forward" label={t('player.next')} size={22} onPress={() => void next(true)} />
        <Slider
          accessibilityLabel={t('player.position')}
          style={s.seekSlider}
          minimumValue={0}
          maximumValue={Math.max(total, 1)}
          value={Math.min(shownPosition, Math.max(total, 1))}
          disabled={total <= 0}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor="rgba(255,255,255,0.18)"
          thumbTintColor={colors.text}
          onValueChange={setDraggingPosition}
          onSlidingComplete={(value) => {
            void seekTo(value);
            setDraggingPosition(value);
            if (releaseTimer.current) clearTimeout(releaseTimer.current);
            releaseTimer.current = setTimeout(() => setDraggingPosition(null), 1200);
          }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  slot: { height: layout.miniPlayerHeight + spacing.xs * 2, justifyContent: 'flex-end' },
  desktopSlot: { height: layout.miniPlayerHeight + spacing.md, justifyContent: 'center', paddingHorizontal: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  box: {
    height: layout.miniPlayerHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.sm, borderRadius: radius.lg, marginHorizontal: spacing.sm, marginBottom: spacing.xs,
    overflow: 'hidden', ...shadow.card,
  },
  desktopBox: { height: layout.miniPlayerHeight - spacing.xs, marginHorizontal: spacing.sm, marginBottom: 0, borderRadius: radius.md, ...shadow.card, shadowOpacity: 0, elevation: 0 },
  trackInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  info: { flex: 1, marginLeft: spacing.xs },
  title: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: font.sm },
  spinner: { width: 40, alignItems: 'center' },
  seekSlider: {
    position: 'absolute',
    left: spacing.sm + 44 + spacing.sm,
    right: spacing.sm + 34 + 40 + 34 + spacing.sm * 3,
    bottom: 0,
    height: 22,
  },
});
