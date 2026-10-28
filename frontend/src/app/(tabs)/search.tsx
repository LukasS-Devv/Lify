import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Header, Search } from '@/components/spotify-clone';
import { t, useTranslation } from '@/i18n';
import { colors } from '@/theme/tokens';

export default function SearchTab() {
  useTranslation();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1024;

  return (
    <View style={[s.container, desktop && s.desktopContainer]}>
      {!desktop ? <Header title={t('tabs.search')} /> : null}
      <Search />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  desktopContainer: { backgroundColor: colors.surface },
});
