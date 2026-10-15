import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function Button({ label, onPress, variant = 'primary', disabled }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.base, s[variant], (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Text style={[s.label, variant === 'primary' && { color: colors.accentText }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.pill, alignItems: 'center' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceAlt },
  danger: { backgroundColor: colors.danger },
  label: { color: colors.text, fontSize: font.md, fontWeight: '700' },
});
