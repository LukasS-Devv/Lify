import { StyleSheet } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer, ServerNotice } from '@/components';
import { BottomTabButton, type TabIconName } from '@/components/spotify-clone';
import { t, useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';

const TABS: { name: string; href: '/' | '/search' | '/library'; label: () => string; icon: TabIconName }[] = [
  { name: 'index', href: '/', label: () => t('tabs.home'), icon: 'home' },
  { name: 'search', href: '/search', label: () => t('tabs.search'), icon: 'search' },
  { name: 'library', href: '/library', label: () => t('tabs.library'), icon: 'library' },
];

export default function TabsLayout() {
  useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.bg }}>
      <TabSlot style={{ flex: 1 }} />
      <MiniPlayer />
      <ServerNotice />
      <TabList style={[s.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <BottomTabButton label={tab.label()} icon={tab.icon} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
});
