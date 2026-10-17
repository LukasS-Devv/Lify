import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

/** Pressable com leve "afundar" ao toque (animação nativa, barata). */
export function PressableScale({ children, style, scaleTo = 0.96, ...props }: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <Pressable {...props} onPressIn={(e) => { to(scaleTo); props.onPressIn?.(e); }} onPressOut={(e) => { to(1); props.onPressOut?.(e); }}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
