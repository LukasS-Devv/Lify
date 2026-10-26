import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Track } from '@/types';
import { formatDuration } from '@/utils/track';
import { colors, font, layout, radius, spacing } from '@/theme/tokens';
import { t, useTranslation } from '@/i18n';
import { getTrackDownloadState, useDownloadedTracksStore } from '@/features/downloads';
import { Cover } from './Cover';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export function TrackRow({ track, onPress, onMore, onArtistPress, active, trailing }: {
  track: Track; onPress: () => void; onMore?: () => void; onArtistPress?: () => void; active?: boolean; trailing?: React.ReactNode;
}) {
  useTranslation();
  const downloaded = useDownloadedTracksStore((state) => state.trackIds.has(track.id));
  useEffect(() => {
    if (track.source !== 'youtube') {
      useDownloadedTracksStore.getState().setDownloaded(track.id, false);
      return;
    }
    const store = useDownloadedTracksStore.getState();
    const revision = store.revisions[track.id] ?? 0;
    void getTrackDownloadState(track.id)
      .then((state) => {
        const current = useDownloadedTracksStore.getState();
        if ((current.revisions[track.id] ?? 0) === revision) {
          current.setDownloaded(track.id, state.status === 'available');
        }
      })
      .catch((error: unknown) => {
        console.warn('[downloads] Could not check track download status', error);
      });
  }, [track.id, track.source]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surface }]}>
      <View>
        <Cover uri={track.artworkUrl} size={layout.artwork} />
        {active ? (
          <View style={s.activeOverlay}><Icon name="stats-chart" size={20} color={colors.accent} /></View>
        ) : null}
      </View>
      <View style={s.info}>
        <View style={s.titleLine}>
          <Text numberOfLines={1} style={[s.title, active && { color: colors.accent }]}>{track.title}</Text>
          {downloaded ? (
            <View accessibilityRole="image" accessibilityLabel={t('downloads.available')}>
              <Icon name="checkmark-circle" size={16} color={colors.accent} />
            </View>
          ) : null}
        </View>
        <View style={s.metadata}>
          {onArtistPress ? (
            <Pressable
              accessibilityRole="button"
              onPress={(event) => { event.stopPropagation(); onArtistPress(); }}
              hitSlop={4}
            >
              <Text numberOfLines={1} style={[s.sub, s.artistLink]}>{track.artist}</Text>
            </Pressable>
          ) : track.artist ? <Text numberOfLines={1} style={s.sub}>{track.artist}</Text> : null}
          {track.artist ? <Text style={s.sub}> · {formatDuration(track.durationSec)}</Text> : <Text style={s.sub}>{formatDuration(track.durationSec)}</Text>}
        </View>
      </View>
      {trailing}
      {onMore ? <IconButton icon="ellipsis-horizontal" label={t('common.more')} size={20} color={colors.textMuted} onPress={onMore} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.md },
  info: { flex: 1 },
  metadata: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { flex: 1, color: colors.text, fontSize: font.lg, fontWeight: '600' },
  sub: { color: colors.textMuted, fontSize: font.md, marginTop: 2 },
  artistLink: { color: colors.accent },
  activeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
