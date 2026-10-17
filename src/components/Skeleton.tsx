import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { colors, layout, radius, spacing } from '@/theme/tokens';

/** Bloco que pulsa enquanto o conteúdo carrega. */
export function Skeleton({ width, height, rounded = radius.sm }: { width: DimensionValue; height: number; rounded?: number }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ width, height, borderRadius: rounded, backgroundColor: colors.elevated, opacity }} />;
}

export function TrackRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={s.row}>
          <Skeleton width={layout.artwork} height={layout.artwork} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ShelfSkeleton() {
  return (
    <View style={s.shelf}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ gap: 8 }}>
          <Skeleton width={layout.shelfCard} height={layout.shelfCard} rounded={radius.md} />
          <Skeleton width={110} height={12} />
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  shelf: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md },
});
