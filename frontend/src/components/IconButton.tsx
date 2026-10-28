import { Pressable, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';

export function IconButton({ icon, onPress, onPressWithPosition, label, size = 24, color = colors.text, disabled, filled }: {
  icon: IconName; onPress: () => void; label: string; size?: number; color?: string; disabled?: boolean; filled?: boolean;
  onPressWithPosition?: (position: { x: number; y: number }) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={10}
      onPress={(event) => {
        onPress();
        onPressWithPosition?.({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
      }}
      style={({ pressed }) => [s.base, filled && s.filled, (pressed || disabled) && { opacity: disabled ? 0.35 : 0.6 }]}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { padding: 6, alignItems: 'center', justifyContent: 'center' },
  filled: { backgroundColor: colors.surfaceAlt, borderRadius: 999, width: 40, height: 40 },
});
