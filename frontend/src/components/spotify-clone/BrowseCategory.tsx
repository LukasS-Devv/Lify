import { useRef } from 'react';
import { Animated, ImageBackground, Platform, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

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

export function BrowseCategory({ title, color, imageUrl, imageSource, desktop, desktopWidth, onPress }: {
  title: string;
  color: string;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  desktop?: boolean;
  desktopWidth?: number;
  onPress: () => void;
}) {
  const source = imageSource ?? (imageUrl ? { uri: imageUrl } : null);
  const scale = useRef(new Animated.Value(1)).current;
  const animateScale = (toValue: number) => {
    Animated.timing(scale, { toValue, duration: 150, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  return (
    <Animated.View
      style={[
        desktop ? s.desktopWidth : desktopWidth !== undefined ? { width: desktopWidth } : s.mobileWidth,
        { transform: [{ scale }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onHoverIn={() => { if (desktop || desktopWidth) animateScale(1.02); }}
        onHoverOut={() => { if (desktop || desktopWidth) animateScale(1); }}
        style={({ pressed }) => [
          s.card,
          desktop || desktopWidth !== undefined ? s.desktopCard : undefined,
          { backgroundColor: color },
          pressed ? s.pressed : undefined,
        ]}
      >
        {source ? (
          <ImageBackground
            source={source}
            imageStyle={[s.image, desktop || desktopWidth !== undefined ? s.desktopImage : undefined]}
            style={s.imageWrap}
          >
            <View style={s.overlay} />
          </ImageBackground>
        ) : null}
        <Text numberOfLines={2} style={s.title}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  mobileWidth: { width: '47%' },
  desktopWidth: { width: '100%', minWidth: 0 },
  card: { width: '100%', height: 70, flexGrow: 0, overflow: 'hidden', borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.md, justifyContent: 'space-between' },
  desktopCard: { height: undefined, aspectRatio: 16 / 9, marginTop: 0 },
  title: { color: colors.text, fontSize: 16, lineHeight: 18, fontWeight: '700', maxWidth: '82%', zIndex: 2 },
  imageWrap: { ...StyleSheet.absoluteFill, opacity: 0.68 },
  image: { width: 100, height: 88, borderRadius: radius.sm, position: 'absolute', left: 80, top:-5, transform: [{ rotate: '9deg' }] },
  desktopImage: { width: '55%', height: '85%', left: '48%', top: '18%' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.16)' },
  pressed: { opacity: 0.75 },
});
