import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer, ServerNotice } from '@/components';
import { BottomTabButton, NAV_ITEMS } from '@/components/spotify-clone';
import { useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';

export default function TabsLayout() {
  useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1024;
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.bg }}>
      <TabSlot style={{ flex: 1 }} />
      {!desktop ? <MiniPlayer /> : null}
      {!desktop ? <ServerNotice /> : null}
      <TabList style={[s.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm), display: desktop ? 'none' : 'flex' }]}>
        {NAV_ITEMS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <BottomTabButton label={tab.label()} icon={tab.activeIcon} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
});
