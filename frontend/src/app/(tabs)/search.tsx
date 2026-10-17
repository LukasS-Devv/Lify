import { StyleSheet, View } from 'react-native';
import { Header, Search } from '@/components/spotify-clone';
import { t, useTranslation } from '@/i18n';
import { colors } from '@/theme/tokens';

export default function SearchTab() {
  useTranslation();

  return (
    <View style={s.container}>
      <Header title={t('tabs.search')} />
      <Search />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
