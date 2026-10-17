import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb, settingsRepo } from '@/database';
import { setupAudio } from '@/services/audio/controller';
import { Button, EmptyState, Screen } from '@/components';
import { setLanguage, t, useTranslation } from '@/i18n';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  useTranslation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const db = await getDb(); // abre o banco e roda migrations
        setLanguage((await settingsRepo.loadSettings(db)).language);
        await setupAudio();
        if (alive) { setError(null); setReady(true); }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : t('app.startFailedGeneric'));
      }
    })();
    return () => { alive = false; };
  }, [attempt]);

  if (error) {
    return (
      <SafeAreaProvider>
        <Screen>
          <EmptyState message={t('app.startFailed', { error })} />
          <Button label={t('common.retry')} onPress={() => setAttempt((n) => n + 1)} />
        </Screen>
      </SafeAreaProvider>
    );
  }
  if (!ready) {
    return <SafeAreaProvider><Screen><EmptyState loading message={t('app.starting')} /></Screen></SafeAreaProvider>;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="playlist/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="playlists" options={{ headerShown: false }} />
        <Stack.Screen name="recent" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: t('settings.title'), headerShadowVisible: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
