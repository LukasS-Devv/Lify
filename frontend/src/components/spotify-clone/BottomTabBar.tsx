import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, font, spacing } from '@/theme/tokens';
import { t } from '@/i18n';

export type TabIconName = ComponentProps<typeof Ionicons>['name'];

export const NAV_ITEMS: { name: string; href: '/' | '/search' | '/library'; label: () => string; icon: TabIconName; activeIcon: TabIconName }[] = [
  { name: 'index', href: '/', label: () => t('tabs.home'), icon: 'home-outline', activeIcon: 'home' },
  { name: 'search', href: '/search', label: () => t('tabs.search'), icon: 'search-outline', activeIcon: 'search' },
  { name: 'library', href: '/library', label: () => t('tabs.library'), icon: 'library-outline', activeIcon: 'library' },
];

export function NavigationItemContent({ label, icon, active, horizontal = false, hideLabel = false }: {
  label: string;
  icon: TabIconName;
  active: boolean;
  horizontal?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <View style={[s.content, horizontal ? s.contentHorizontal : s.contentVertical]}>
      <Ionicons name={icon} size={22} color={active ? colors.text : colors.textMuted} />
      {!hideLabel ? <Text numberOfLines={1} style={[s.label, active && s.active]}>{label}</Text> : null}
    </View>
  );
}

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
    <NavigationItemContent label={label} icon={icon} active={Boolean(isFocused)} />
  </Pressable>
));
BottomTabButton.displayName = 'BottomTabButton';

export function TabBarBackground() {
  return <View pointerEvents="none" style={s.background} />;
}

const s = StyleSheet.create({
  background: { ...StyleSheet.absoluteFill, top: 'auto', height: 90, zIndex: 0, backgroundColor: colors.bg },
  tab: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: spacing.xs },
  content: { alignItems: 'center', justifyContent: 'center' },
  contentVertical: { flexDirection: 'column', gap: 5 },
  contentHorizontal: { flexDirection: 'row', gap: spacing.md },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '400' },
  active: { color: colors.text },
});
