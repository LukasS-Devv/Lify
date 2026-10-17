import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, font, spacing } from '@/theme/tokens';

export type TabIconName = ComponentProps<typeof Ionicons>['name'];

export const BottomTabButton = forwardRef<View, TabTriggerSlotProps & {
  label: string;
  icon: TabIconName;
}>(({ label, icon, isFocused, children: _children, ...props }, ref) => (
  <Pressable
    ref={ref}
    {...props}
    accessibilityRole="tab"
    accessibilityState={{ selected: isFocused }}
    style={s.tab}
  >
    <Ionicons name={icon} size={22} color={isFocused ? colors.text : colors.textMuted} />
    <Text numberOfLines={1} style={[s.label, isFocused && s.active]}>{label}</Text>
  </Pressable>
));
BottomTabButton.displayName = 'BottomTabButton';

export function TabBarBackground() {
  return <View pointerEvents="none" style={s.background} />;
}

const s = StyleSheet.create({
  background: { ...StyleSheet.absoluteFill, top: 'auto', height: 90, zIndex: 0, backgroundColor: colors.bg },
  tab: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: spacing.xs },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '400' },
  active: { color: colors.text },
});
