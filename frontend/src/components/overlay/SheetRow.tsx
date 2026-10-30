import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '@/theme/tokens';
import { Icon, type IconName } from '../Icon';

export function SheetRow({
  label,
  icon,
  leading,
  subtitle,
  right,
  onPress,
  selected = false,
  disabled = false,
  destructive = false,
  accessibilityLabel,
  role = 'menuitem',
}: {
  label: string;
  icon?: IconName;
  leading?: ReactNode;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
  role?: 'button' | 'menuitem' | 'checkbox';
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed, disabled && s.disabled]}
    >
      {leading ?? (icon ? <Icon name={icon} size={22} color={destructive ? '#E5736A' : selected ? colors.accent : colors.textMuted} /> : null)}
      <View style={s.copy}>
        <Text numberOfLines={1} style={[s.label, destructive && s.destructive, selected && s.selected]}>{label}</Text>
        {subtitle ? <Text numberOfLines={1} style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (selected ? <Icon name="checkmark" size={20} color={colors.accent} /> : null)}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: 8 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { color: colors.text, fontSize: font.md, fontWeight: '400' },
  selected: { color: colors.accent, fontWeight: '600' },
  subtitle: { color: '#A8A8A8', fontSize: 13 },
  destructive: { color: '#E5736A' },
  pressed: { backgroundColor: '#1E1E1E' },
  disabled: { opacity: 0.45 },
});
