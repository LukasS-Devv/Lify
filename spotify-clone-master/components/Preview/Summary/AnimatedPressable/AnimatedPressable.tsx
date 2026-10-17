import * as React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  interpolate,
  Easing,
} from 'react-native-reanimated';

import FontAwesome5 from '@expo/vector-icons/FontAwesome';

import { COLORS, IconType } from '@config';
import { styles } from './styles';

export type AnimatedPressablePropsType = {
  defaultIcon: IconType;
  activeIcon: IconType;
  isActive: boolean;
};

export const AnimatedPressable = ({
  defaultIcon,
  activeIcon,
  isActive,
}: AnimatedPressablePropsType) => {
  const progress = useSharedValue(Number(isActive));

  React.useEffect(() => {
    progress.value = Number(isActive);
  }, [isActive, progress]);

  const AnimatedIcon = Animated.createAnimatedComponent(FontAwesome5);
  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  const handlePress = () => {
    progress.value = withTiming(progress.value === 1 ? 0 : 1, {
      duration: 400,
      easing: Easing.elastic(2),
    });
  };

  const animatedPressableStyles = useAnimatedStyle(
    () => ({
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        [COLORS.GREY, COLORS.TINT]
      ),
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ['transparent', COLORS.TINT]
      ),
      shadowOpacity: interpolate(progress.value, [0, 0.2, 1], [0, 1, 0]),
      shadowRadius: interpolate(progress.value, [0, 0.3, 1], [0, 8, 0]),
      transform: [
        {
          scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.25, 1]),
        },
      ],
    }),
    [isActive]
  );

  const animatedDefaultStyles = useAnimatedStyle(
    () => ({
      opacity: interpolate(progress.value, [0, 1], [1, 0]),
      transform: [
        {
          rotate: `${interpolate(progress.value, [0, 1], [0, 35])}deg`,
        },
      ],
    }),
    [isActive]
  );

  const animatedActiveStyles = useAnimatedStyle(
    () => ({
      opacity: interpolate(progress.value, [0, 1], [0, 1]),
      transform: [
        {
          rotate: `${interpolate(progress.value, [0, 1], [-15, 0])}deg`,
        },
      ],
    }),
    [isActive]
  );

  return (
    <AnimatedPressable
      style={[styles.container, animatedPressableStyles]}
      onPress={handlePress}
    >
      <Animated.View style={[styles.view, animatedDefaultStyles]}>
        <AnimatedIcon name={defaultIcon} size={14} color={COLORS.GREY} />
      </Animated.View>
      <Animated.View style={[styles.view, animatedActiveStyles]}>
        <AnimatedIcon name={activeIcon} size={14} color={COLORS.PRIMARY} />
      </Animated.View>
    </AnimatedPressable>
  );
};
