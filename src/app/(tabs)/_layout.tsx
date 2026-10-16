import { forwardRef } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  // IMPORTANTE: o expo-router só descobre as rotas se <TabList> for filho DIRETO de <Tabs>
  // (não pode estar dentro de View/SafeAreaView), por isso o layout é feito via estilos.
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.bg }}>
      <TabSlot style={{ flex: 1 }} />
      <MiniPlayer />
      <TabList style={[s.bar, { paddingBottom: insets.bottom }]}>
        {TABS.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
            <TabButton label={t.label} />
          </TabTrigger>
        ))}
      </TabList>
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
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  trigger: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  label: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
});
