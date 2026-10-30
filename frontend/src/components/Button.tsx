import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';

export function Button({ label, onPress, variant = 'primary', disabled, icon, loading, style }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; icon?: IconName; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const fg = variant === 'primary' ? colors.accentText : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.base, s[variant], style, (pressed || disabled) && { opacity: 0.6 }]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={[s.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 12, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceAlt },
  danger: { backgroundColor: colors.danger },
  label: { fontSize: font.md, fontWeight: '700' },
});
