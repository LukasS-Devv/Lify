import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { IconButton } from '@/components';
import { Header, Home } from '@/components/spotify-clone';
import { t, useTranslation } from '@/i18n';
import { colors } from '@/theme/tokens';

export default function HomeTab() {
  useTranslation();
  const router = useRouter();
  const hour = new Date().getHours();
  const greeting = t(
    hour < 5 || hour >= 18
      ? 'home.greeting.evening'
      : hour < 12
        ? 'home.greeting.morning'
        : 'home.greeting.afternoon',
  );

  return (
    <View style={s.container}>
      <Header
        title={greeting}
        right={
          <IconButton
            icon="settings-outline"
            label={t('home.settings')}
            onPress={() => router.push('/settings')}
          />
        }
      />
      <Home />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
