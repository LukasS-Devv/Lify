import { ImageBackground, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { colors, font, radius, spacing } from '@/theme/tokens';

export const GENRE_PLACEHOLDERS: Record<string, ImageSourcePropType> = {
  'genre.pop': require('../../../assets/images/genres/pop.png'),
  'genre.rock': require('../../../assets/images/genres/rock.png'),
  'genre.hiphop': require('../../../assets/images/genres/hiphop.png'),
  'genre.electronic': require('../../../assets/images/genres/electronic.png'),
  'genre.jazz': require('../../../assets/images/genres/jazz.png'),
  'genre.classical': require('../../../assets/images/genres/classical.png'),
  'genre.jpop': require('../../../assets/images/genres/jpop.png'),
  'genre.mpb': require('../../../assets/images/genres/mpb.png'),
};

export function BrowseCategory({ title, color, imageUrl, imageSource, onPress }: {
  title: string;
  color: string;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  onPress: () => void;
}) {
  const source = imageSource ?? (imageUrl ? { uri: imageUrl } : null);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.card, { backgroundColor: color }, pressed && s.pressed]}>
      {source ? (
        <ImageBackground source={source} imageStyle={s.image} style={s.imageWrap}>
          <View style={s.overlay} />
        </ImageBackground>
      ) : null}
      <Text numberOfLines={2} style={s.title}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { width: '47%', height: 70, flexGrow: 0, overflow: 'hidden', borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.md, justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 16, lineHeight: 18, fontWeight: '700', maxWidth: '82%', zIndex: 2 },
  imageWrap: { ...StyleSheet.absoluteFill, opacity: 0.68 },
  image: { width: 100, height: 88, borderRadius: radius.sm, position: 'absolute', left: 80, top:-5, transform: [{ rotate: '9deg' }] },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.16)' },
  pressed: { opacity: 0.75 },
});
