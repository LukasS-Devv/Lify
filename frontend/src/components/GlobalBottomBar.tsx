import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, useTranslation } from '@/i18n';
import { colors, font, spacing } from '@/theme/tokens';

const ITEMS = [
  { href: '/', label: () => t('tabs.home'), icon: 'home' as const, activeIcon: 'home' as const },
  { href: '/search', label: () => t('tabs.search'), icon: 'search-outline' as const, activeIcon: 'search' as const },
  { href: '/library', label: () => t('tabs.library'), icon: 'library-outline' as const, activeIcon: 'library' as const },
];

export function GlobalBottomBar() {
  useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {ITEMS.map((item) => {
        const active = item.href === '/'
          ? pathname === '/' || pathname === '/index'
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Pressable
            key={item.href}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(item.href)}
            style={s.tab}
          >
            <Ionicons name={active ? item.activeIcon : item.icon} size={22} color={active ? colors.text : colors.textMuted} />
            <Text numberOfLines={1} style={[s.label, active && s.activeLabel]}>{item.label()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
  tab: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: spacing.xs },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '400' },
  activeLabel: { color: colors.text },
});
