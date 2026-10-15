import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Track } from '@/types';
import { formatDuration } from '@/utils/track';
import { colors, font, layout, radius, spacing } from '@/theme/tokens';

export function TrackRow({ track, onPress, onMore, active }: {
  track: Track; onPress: () => void; onMore?: () => void; active?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surface }]}>
      <Image source={{ uri: track.artworkUrl }} style={s.art} />
      <View style={s.info}>
        <Text numberOfLines={1} style={[s.title, active && { color: colors.accent }]}>{track.title}</Text>
        <Text numberOfLines={1} style={s.sub}>{track.artist} · {formatDuration(track.durationSec)}</Text>
      </View>
      {onMore ? (
        <Pressable onPress={onMore} hitSlop={12} accessibilityLabel="Mais opções" style={s.more}>
          <Text style={s.moreText}>⋯</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.md },
  art: { width: layout.artwork, height: layout.artwork, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  info: { flex: 1 },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '600' },
  sub: { color: colors.textMuted, fontSize: font.md, marginTop: 2 },
  more: { paddingHorizontal: spacing.sm },
  moreText: { color: colors.textMuted, fontSize: 24 },
});
