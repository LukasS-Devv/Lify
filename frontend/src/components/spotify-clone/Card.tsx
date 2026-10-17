import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { ArtworkImage } from '../ArtworkImage';

export type CardItem = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  onPress?: () => void;
  onMore?: () => void;
  moreLabel?: string;
  active?: boolean;
};

export function Card({ item, size = 144, shape = 'square' }: {
  item: CardItem;
  size?: number;
  shape?: 'square' | 'circle';
}) {
  const artworkStyle = [s.artwork, {
    width: size,
    height: size,
    borderRadius: shape === 'circle' ? size / 2 : radius.sm,
  }];

  return (
    <Pressable
      accessibilityRole={item.onPress ? 'button' : undefined}
      disabled={!item.onPress}
      onPress={item.onPress}
      style={({ pressed }) => [s.card, { width: size }, pressed && s.pressed]}
    >
      <View style={artworkStyle}>
        {item.imageUrl
          ? <ArtworkImage uri={item.imageUrl} style={s.image} />
          : <View style={[StyleSheet.absoluteFill, s.placeholder]}><Text style={s.glyph}>♫</Text></View>}
        {item.onMore ? (
          <Pressable accessibilityRole="button" accessibilityLabel={item.moreLabel} onPress={(event) => { event.stopPropagation(); item.onMore?.(); }} hitSlop={8} style={s.more}>
            <Text style={s.moreText}>⋯</Text>
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={2} style={[s.title, { width: size }, item.active && s.active]}>{item.title}</Text>
      {item.subtitle ? <Text numberOfLines={1} style={[s.subtitle, { width: size }]}>{item.subtitle}</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { marginVertical: spacing.sm },
  artwork: { backgroundColor: colors.surfaceAlt, overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  image: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  glyph: { color: colors.textMuted, fontSize: 44 },
  more: { position: 'absolute', right: spacing.xs, top: spacing.xs, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.65)' },
  moreText: { color: colors.text, fontSize: 20, lineHeight: 22 },
  title: { color: colors.text, fontSize: 13, lineHeight: 16, fontWeight: '700', marginTop: 10 },
  active: { color: colors.accent },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 16, marginTop: 5 },
  pressed: { opacity: 0.75 },
});
