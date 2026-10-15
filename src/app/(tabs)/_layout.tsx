import { forwardRef } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MiniPlayer } from '@/components';
import { colors, font, spacing } from '@/theme/tokens';

const TABS = [
  { name: 'index', href: '/', label: 'Início' },
  { name: 'search', href: '/search', label: 'Buscar' },
  { name: 'library', href: '/library', label: 'Biblioteca' },
  { name: 'playlists', href: '/playlists', label: 'Playlists' },
  { name: 'settings', href: '/settings', label: 'Ajustes' },
] as const;

/**
 * Tabs "headless": estrutura e navegação prontas, sem estilo nativo.
 * Na fase visual basta trocar a aparência de <TabTrigger> (ícones, animações).
 */
export default function TabsLayout() {
  return (
    <Tabs>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TabSlot style={{ flex: 1 }} />
        <MiniPlayer />
        <SafeAreaView edges={['bottom']} style={s.barWrap}>
          <TabList style={s.bar}>
            {TABS.map((t) => (
              <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
                <TabButton label={t.label} />
              </TabTrigger>
            ))}
          </TabList>
        </SafeAreaView>
      </View>
    </Tabs>
  );
}

// Com `asChild`, o TabTrigger injeta onPress/isFocused neste componente.
const TabButton = forwardRef<View, TabTriggerSlotProps & { label: string }>(
  ({ label, isFocused, children: _c, ...props }, ref) => (
    <Pressable ref={ref} {...props} style={s.trigger}>
      <Text style={[s.label, isFocused && { color: colors.accent }]}>{label}</Text>
    </Pressable>
  ),
);
TabButton.displayName = 'TabButton';

const s = StyleSheet.create({
  barWrap: { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  bar: { flexDirection: 'row' },
  trigger: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  label: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
});
