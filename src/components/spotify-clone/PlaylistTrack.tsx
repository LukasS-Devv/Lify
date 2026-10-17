import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Track } from '@/types';
import { t } from '@/i18n';
import { colors, font, spacing } from '@/theme/tokens';

export function PlaylistTrack({ track, active, onPress, onMore }: {
  track: Track;
  active: boolean;
  onPress: () => void;
  onMore: () => void;
}) {
  return (
    <View style={s.container}>
      <Pressable accessibilityRole="button" onPress={onPress} style={s.play}>
        <Image source={{ uri: track.artworkUrl }} style={s.image} />
        <View style={s.content}>
          <Text numberOfLines={1} style={[s.title, active && s.active]}>{track.title}</Text>
          <Text numberOfLines={1} style={s.artist}>{track.artist}</Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('trackRow.moreOptions')} onPress={onMore} hitSlop={12} style={s.more}>
        <Text style={s.moreIcon}>⋯</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { height: 66, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center' },
  play: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  image: { width: 50, height: 50, marginRight: 10, backgroundColor: colors.surfaceAlt },
  content: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 17, lineHeight: 20 },
  active: { color: colors.accent },
  artist: { color: colors.textMuted, fontSize: font.md, lineHeight: 18, marginTop: 2 },
  more: { width: 40, alignItems: 'flex-end', justifyContent: 'center' },
  moreIcon: { color: colors.textMuted, fontSize: 22 },
});
