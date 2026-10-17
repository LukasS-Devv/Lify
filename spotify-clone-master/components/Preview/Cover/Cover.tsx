import * as React from 'react';
import { View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getFallbackImage } from '@utils';
import { COLORS, COVER_SIZE } from '@config';

import { styles } from './styles';
import { useApplicationDimensions } from '@hooks';

export type CoverPropsType = {
  type: 'album' | 'playlist';
  imageURL: string;
  animatedValue: SharedValue<number>;
};

export const Cover = ({ imageURL, animatedValue, type }: CoverPropsType) => {
  const [imageSource, setImageSource] = React.useState(getFallbackImage(type));
  const progress = useSharedValue(1);
  const { width } = useApplicationDimensions();
  const { top: statusBarOffset } = useSafeAreaInsets();

  React.useEffect(() => {
    if (!imageURL) {
      return;
    }

    progress.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(setImageSource)({ uri: imageURL });
      progress.value = withTiming(1, { duration: 250 });
    });
  }, [imageURL, progress]);

  const animatedImageStyles = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          animatedValue.value,
          [-COVER_SIZE, 0, COVER_SIZE],
          [-COVER_SIZE / 2, 0, COVER_SIZE / 1.5],
          Extrapolation.CLAMP
        ),
      },
      {
        scale: interpolate(
          animatedValue.value,
          [-COVER_SIZE / 2, 0, COVER_SIZE * 2],
          [1.25, 1, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
    opacity: interpolate(
      animatedValue.value,
      [0, COVER_SIZE / 1.5],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const animatedImageSwitchStyles = useAnimatedStyle(
    () => ({
      opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    }),
    [progress, imageURL]
  );

  return (
    <View style={{ paddingTop: statusBarOffset }}>
      <Animated.Image
        blurRadius={100}
        style={[styles.imageBg, animatedImageSwitchStyles]}
        source={imageSource}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[COLORS.PRIMARY, 'transparent', COLORS.PRIMARY]}
        style={styles.gradient}
      />
      <Animated.Image
        style={[styles.image, animatedImageStyles, animatedImageSwitchStyles]}
        source={imageSource}
        resizeMode="cover"
      />
      <View style={[styles.overlay, { width: width + 40 * 2 }]} />
    </View>
  );
};
