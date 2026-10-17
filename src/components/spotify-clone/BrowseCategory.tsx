import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function BrowseCategory({ title, color, imageUrl, symbol = '♫', onPress }: {
  title: string;
  color: string;
  imageUrl?: string;
  symbol?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.card, { backgroundColor: color }, pressed && s.pressed]}>
      {imageUrl ? (
        <ImageBackground source={{ uri: imageUrl }} imageStyle={s.image} style={s.imageWrap}>
          <View style={s.overlay} />
        </ImageBackground>
      ) : <Text style={s.symbol}>{symbol}</Text>}
      <Text numberOfLines={2} style={s.title}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { width: '47%', height: 100, flexGrow: 0, overflow: 'hidden', borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.md, justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 16, lineHeight: 18, fontWeight: '700', maxWidth: '82%', zIndex: 2 },
  imageWrap: { ...StyleSheet.absoluteFill, opacity: 0.68 },
  image: { width: 88, height: 88, borderRadius: radius.sm, position: 'absolute', right: -14, bottom: 8, transform: [{ rotate: '18deg' }] },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.16)' },
  symbol: { color: 'rgba(255,255,255,0.56)', fontSize: 46, lineHeight: 50, alignSelf: 'flex-end', transform: [{ rotate: '-12deg' }] },
  pressed: { opacity: 0.75 },
});
