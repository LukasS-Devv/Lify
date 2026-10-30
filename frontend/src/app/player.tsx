import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useProgress } from '@/services/audio/useProgress';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Cover, EmptyState, FavoriteToast, Icon, IconButton, QueueSheet, SleepTimerModal, TrackActionsModal } from '@/components';
import { usePlayer } from '@/features/player/usePlayer';
import {
  cancelSleepTimer, next, previous, seekTo, setRepeat, setSleepTimer, setSleepTimerAtTrackEnd, toggleShuffle, togglePlay,
} from '@/services/audio/controller';
import { usePlayerStore } from '@/services/audio/store';
import { t, useTranslation } from '@/i18n';
import type { RepeatMode } from '@/types';
import { gradientFor } from '@/utils/color';
import { formatDuration } from '@/utils/track';
import { colors, font, radius, shadow, spacing } from '@/theme/tokens';

const REPEAT_NEXT: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'reverse', reverse: 'off' };

export default function PlayerScreen() {
  useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1024;
  const { track, status, error, repeat, shuffle, favorite, toggleFavorite } = usePlayer();
  const sleepTimerEndsAt = usePlayerStore((state) => state.sleepTimerEndsAt);
  const sleepTimerPreset = usePlayerStore((state) => state.sleepTimerPreset);
  const { position, duration } = useProgress(500);
  const [dragging, setDragging] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>();
  const [queueOpen, setQueueOpen] = useState(false);
  const [sleepTimerVisible, setSleepTimerVisible] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now());
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playing = status === 'playing';
  const scale = useRef(new Animated.Value(playing ? 1 : 0.9)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: playing ? 1 : 0.9, useNativeDriver: true, friction: 7 }).start();
  }, [playing, scale]);
  useEffect(() => () => { if (releaseTimer.current) clearTimeout(releaseTimer.current); }, []);
  useEffect(() => {
    if (!sleepTimerEndsAt) return;
    const interval = setInterval(() => setTimerNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndsAt]);

  if (!track) {
    return (
      <SafeAreaView style={s.root}>
        <EmptyState icon="musical-notes" message={t('player.nothing')} />
        <View style={{ alignItems: 'center' }}>
          <Button
            label={t('common.close')}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const total = duration || track.durationSec || 0;
  const shown = dragging ?? position;
  const busy = status === 'loading' || status === 'buffering';
  const [top] = gradientFor(track.id, colors.bg);
  const cover = desktop
    ? Math.min(360, Math.max(220, height - 250), (width - spacing.lg * 4) * 0.34)
    : Math.min(width - spacing.lg * 2, 360);
  const timerRemaining = sleepTimerEndsAt
    ? Math.ceil(Math.max(0, sleepTimerEndsAt - timerNow) / 1000)
    : null;

  const onRelease = (v: number) => {
    void seekTo(v);
    setDragging(v); // segura o polegar no lugar até o player reportar a nova posição
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setDragging(null), 1200);
  };

  const header = (
    <View>
      <View style={[s.top, desktop && s.desktopTop]}>
        <IconButton
          icon="chevron-down"
          size={28}
          label={t('common.close')}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
        />
        <Text style={s.topTitle}>{t('player.nowPlaying')}</Text>
        <View style={s.topActions}>
          <IconButton
            icon="timer-outline"
            color={sleepTimerEndsAt ? colors.accent : colors.textMuted}
            label={t('player.sleepTimer.open')}
            onPress={() => setSleepTimerVisible(true)}
          />
          <IconButton
            icon="ellipsis-horizontal"
            label={t('common.more')}
            onPress={() => setMenu(true)}
            onPressWithPosition={setMenuPosition}
          />
        </View>
      </View>

      <View style={[s.playerContent, desktop && s.desktopPlayerContent]}>
        <View style={desktop && s.desktopArtworkColumn}>
          <Animated.View style={[s.artWrap, desktop && s.desktopArtWrap, desktop && shadow.card, { transform: [{ scale }] }]}>
            <Cover uri={track.artworkUrl} size={cover} radius={radius.lg} />
          </Animated.View>
        </View>

        <View style={[s.playerControls, desktop && s.desktopPlayerControls]}>
          <View style={[s.titleRow, desktop && s.desktopTitleRow]}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={s.title}>{track.title}</Text>
              {track.artist ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('artist.openProfile', { name: track.artist })}
                  onPress={() => router.push({
                    pathname: '/artist/[id]',
                    params: { id: 'search', name: track.artist.split(',')[0].trim() },
                  })}
                  hitSlop={6}
                >
                  <Text numberOfLines={1} style={s.artist}>{track.artist}</Text>
                </Pressable>
              ) : null}
            </View>
            <IconButton icon={favorite ? 'heart' : 'heart-outline'} size={28} color={favorite ? colors.accent : colors.text}
              label={favorite ? t('player.unlike') : t('player.like')} onPress={toggleFavorite} />
          </View>
          {status === 'error' ? (
            <View style={s.errBox}>
              <Text style={s.err}>{error ?? t('player.error')}</Text>
              <Button variant="secondary" icon="refresh" label={t('common.retry')} onPress={() => void togglePlay()} />
            </View>
          ) : null}

          <View style={[s.seek, desktop && s.desktopSeek]}>
            <Slider
              accessibilityLabel={t('player.position')}
              style={{ height: 40 }}
              minimumValue={0}
              maximumValue={Math.max(total, 1)}
              value={Math.min(shown, Math.max(total, 1))}
              disabled={total <= 0}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor="rgba(255,255,255,0.22)"
              thumbTintColor={colors.text}
              onValueChange={setDragging}
              onSlidingComplete={onRelease}
            />
            <View style={s.times}>
              <Text style={s.time}>{formatDuration(shown)}</Text>
              <Text style={s.time}>{formatDuration(total)}</Text>
            </View>
          </View>

          <View style={[s.controls, desktop && s.desktopControls]}>
            <IconButton
              icon="shuffle"
              size={24}
              color={shuffle ? colors.accent : colors.textMuted}
              label={t(shuffle ? 'player.shuffle.on' : 'player.shuffle.off')}
              onPress={toggleShuffle}
            />
            <IconButton icon="play-skip-back" size={34} label={t('player.previous')} onPress={() => void previous()} />
            <Pressable accessibilityRole="button" accessibilityLabel={playing ? t('player.pause') : t('player.play')} onPress={() => void togglePlay()} style={s.playBtn}>
              {busy ? <ActivityIndicator color={colors.accentText} /> : <Icon name={playing ? 'pause' : 'play'} size={36} color={colors.accentText} />}
            </Pressable>
            <IconButton icon="play-skip-forward" size={34} label={t('player.next')} onPress={() => void next(true)} />
            <View style={s.repeatButton}>
              {repeat === 'one' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('player.repeat.one')}
                  hitSlop={10}
                  onPress={() => void setRepeat(REPEAT_NEXT[repeat])}
                  style={s.repeatOneButton}
                >
                  <View style={s.reversedRepeatIcon}>
                    <Icon name="refresh" size={25} color={colors.accent} />
                  </View>
                  <Text style={s.repeatOneNumber}>1</Text>
                </Pressable>
              ) : (
                <IconButton
                  icon={repeat === 'reverse' ? 'arrow-undo' : 'repeat'}
                  size={24}
                  color={repeat === 'off' ? colors.textMuted : colors.accent}
                  label={t(`player.repeat.${repeat}`)}
                  onPress={() => void setRepeat(REPEAT_NEXT[repeat])}
                />
              )}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: queueOpen }}
            accessibilityLabel={queueOpen ? t('player.hideQueue') : t('player.showQueue')}
            onPress={() => setQueueOpen((open) => !open)}
            style={[s.sectionRow, desktop && s.desktopSectionRow]}
            hitSlop={6}
          >
            <Text style={s.section}>{t('player.nextUp')}</Text>
            <Icon name={queueOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[top, colors.bg]} locations={desktop ? [0, 0.7] : [0, 1]} style={s.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          data={[]}
          ListHeaderComponent={header}
          contentContainerStyle={[{ paddingBottom: spacing.xl }, desktop && s.desktopListContent]}
        />
      </SafeAreaView>
      <TrackActionsModal
        track={menu ? track : null}
        position={menuPosition}
        onClose={() => { setMenu(false); setMenuPosition(undefined); }}
      />
      <FavoriteToast />
      <QueueSheet visible={queueOpen} onClose={() => setQueueOpen(false)} />
      <SleepTimerModal
        visible={sleepTimerVisible}
        selectedPreset={sleepTimerPreset}
        remainingTime={timerRemaining === null ? null : formatDuration(timerRemaining)}
        onSelect={(minutes) => { setSleepTimer(minutes); setSleepTimerVisible(false); }}
        onSelectTrackEnd={() => { setSleepTimerAtTrackEnd(); setSleepTimerVisible(false); }}
        onCancel={() => { cancelSleepTimer(); setSleepTimerVisible(false); }}
        onClose={() => setSleepTimerVisible(false)}
      />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  desktopTop: { maxWidth: 1200, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  topTitle: { color: colors.text, fontSize: font.md, fontWeight: '700' },
  playerContent: {},
  desktopPlayerContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  desktopArtworkColumn: { flexShrink: 0 },
  artWrap: { alignItems: 'center', marginTop: spacing.md },
  desktopArtWrap: { marginTop: 0 },
  playerControls: {},
  desktopPlayerControls: { flex: 1, minWidth: 0, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  desktopTitleRow: { paddingHorizontal: 0, marginTop: 0 },
  title: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
  artist: { color: colors.textMuted, fontSize: font.lg, marginTop: 2 },
  errBox: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.sm, alignItems: 'flex-start' },
  err: { color: colors.danger },
  seek: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  desktopSeek: { paddingHorizontal: 0, marginTop: spacing.md },
  times: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  time: { color: colors.textMuted, fontSize: font.sm },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: spacing.md, marginTop: spacing.md },
  desktopControls: { paddingHorizontal: 0, marginTop: spacing.sm },
  playBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  repeatButton: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  repeatOneButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  reversedRepeatIcon: { transform: [{ scaleX: -1 }] },
  repeatOneNumber: { position: 'absolute', color: colors.accent, fontSize: 11, fontWeight: '900', lineHeight: 14, textAlign: 'center', textShadowColor: colors.bg, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  desktopSectionRow: { paddingRight: 0, marginTop: spacing.md, marginBottom: 0 },
  section: { color: colors.text, fontSize: font.lg, fontWeight: '800', paddingHorizontal: spacing.lg },
  qrow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  qmain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtitle: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  qsub: { color: colors.textMuted, fontSize: font.sm },
  qPast: { opacity: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.textMuted },
  dividerText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '700' },
  note: { color: colors.textMuted, fontSize: font.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, textAlign: 'center' },
  desktopListContent: { paddingBottom: spacing.xl },
});
