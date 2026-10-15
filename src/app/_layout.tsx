import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '@/database';
import { setupAudio } from '@/services/audio/controller';
import { Button, EmptyState, Screen } from '@/components';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await getDb(); // abre o banco e roda migrations
        await setupAudio();
        if (alive) { setError(null); setReady(true); }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Falha ao iniciar o app.');
      }
    })();
    return () => { alive = false; };
  }, [attempt]);

  if (error) {
    return (
      <SafeAreaProvider>
        <Screen>
          <EmptyState message={`Não foi possível iniciar o Lify.\n${error}`} />
          <Button label="Tentar novamente" onPress={() => setAttempt((n) => n + 1)} />
        </Screen>
      </SafeAreaProvider>
    );
  }
  if (!ready) {
    return <SafeAreaProvider><Screen><EmptyState loading message="Iniciando…" /></Screen></SafeAreaProvider>;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="playlist/[id]" options={{ title: 'Playlist' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
