import { useEffect, type ReactNode } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { IconButton, MiniPlayer, ServerNotice } from '@/components';
import { NAV_ITEMS, NavigationItemContent } from '@/components/spotify-clone';
import { t } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function AppShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const desktop = Platform.OS === 'web' && width >= 1024;
  const expanded = width >= 1440;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.dataset.lifyScrollbarStyles = 'true';
    style.textContent = `
      html, body, * {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      *::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  if (!desktop) return children;

  return (
    <View style={s.shell}>
      <View style={s.body}>
        <DesktopSidebar expanded={expanded} />
        <View style={s.panel}>
          <View style={s.content}>
            <DesktopHeader pathname={pathname} />
            <View style={s.noticeSlot}>
              <ServerNotice desktop />
            </View>
            <View style={s.main}>{children}</View>
          </View>
        </View>
      </View>
      {pathname !== '/player' ? <MiniPlayer desktop /> : null}
    </View>
  );
}

function DesktopSidebar({ expanded }: { expanded: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={[s.sidebar, { width: expanded ? 280 : 72 }]}>
      <Image source={require('../../assets/images/LifyIcon.png')} style={s.logo} />
      <View style={s.nav}>
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/'
            ? pathname === '/' || pathname === '/index'
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Pressable
              key={item.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label()}
              onPress={() => router.navigate(item.href)}
              style={[s.navItem, expanded && s.navItemExpanded]}
            >
              <NavigationItemContent
                label={item.label()}
                icon={active ? item.activeIcon : item.icon}
                active={active}
                horizontal
                hideLabel={!expanded}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DesktopHeader({ pathname }: { pathname: string }) {
  const hour = new Date().getHours();
  const title = pathname === '/' || pathname === '/index'
    ? t(hour < 5 || hour >= 18 ? 'home.greeting.evening' : hour < 12 ? 'home.greeting.morning' : 'home.greeting.afternoon')
    : pathname === '/search'
      ? t('tabs.search')
      : pathname === '/library'
        ? t('tabs.library')
        : pathname === '/settings'
          ? t('settings.title')
          : t('tabs.home');
  const router = useRouter();

  return (
    <View style={s.header}>
      <Text numberOfLines={1} style={s.greeting}>{title}</Text>
      <IconButton
        icon="settings-outline"
        label={t('home.settings')}
        onPress={() => router.push('/settings')}
      />
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, minHeight: 0, backgroundColor: colors.bg },
  body: { flex: 1, minHeight: 0, flexDirection: 'row' },
  sidebar: { flexShrink: 0, paddingTop: spacing.lg, paddingHorizontal: spacing.sm, backgroundColor: colors.bg, alignItems: 'center' },
  logo: { width: 40, height: 40, marginBottom: spacing.xl },
  nav: { width: '100%', gap: spacing.sm },
  navItem: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.md, borderRadius: radius.sm },
  navItemExpanded: { justifyContent: 'flex-start', paddingHorizontal: spacing.md },
  panel: { flex: 1, minWidth: 0, minHeight: 0, margin: spacing.sm, overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.surface },
  content: { flex: 1, minWidth: 0, minHeight: 0, width: '100%', maxWidth: 1400, alignSelf: 'center', backgroundColor: colors.surface },
  header: { height: 72, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, backgroundColor: colors.surface },
  greeting: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
  noticeSlot: { width: '100%', paddingHorizontal: spacing.lg },
  main: { flex: 1, minHeight: 0 },
});
