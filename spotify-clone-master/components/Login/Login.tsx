import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { COLORS } from '@config';
import { translations } from '@data';

import { styles } from './styles';

export type LoginPropsType = {
  handlePress: () => void;
  isPressableDisabled: boolean;
};

export const Login = ({ isPressableDisabled, handlePress }: LoginPropsType) => {
  const progress = useSharedValue(0);
  const { top: statusBarOffset } = useSafeAreaInsets();

  const animatedPressableStyles = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.TINT, COLORS.LIGHTER_GREY]
    ),
  }));

  const animatedTextStyles = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.SECONDARY, COLORS.PRIMARY]
    ),
  }));

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
  const AnimatedText = Animated.createAnimatedComponent(Text);

  return (
    <View style={[styles.wrapper, { paddingTop: statusBarOffset }]}>
      <Image
        style={styles.backgroundImage}
        source={require('@assets/images/login.png')}
      />

      <View style={styles.container}>
        <View style={styles.logo}>
          <Image
            style={styles.backgroundImage}
            source={require('@assets/images/logo.png')}
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{translations.loginWelcome}</Text>
        </View>

        <AnimatedPressable
          onPressIn={() => {
            progress.value = withTiming(1, { duration: 250 });
          }}
          onPressOut={() => {
            progress.value = withTiming(0, { duration: 250 });
          }}
          onPress={handlePress}
          disabled={isPressableDisabled}
          style={[styles.pressable, animatedPressableStyles]}
        >
          <AnimatedText style={[styles.text, animatedTextStyles]}>
            {translations.loginButton}
          </AnimatedText>
        </AnimatedPressable>

        <Text style={styles.note}>{translations.loginNote}</Text>
      </View>
    </View>
  );
};
