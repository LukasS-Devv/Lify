import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, useWindowDimensions } from 'react-native';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb, resetDatabase, settingsRepo } from '@/database';
import { restoreNativeQueue } from '@/services/audio/controller';
import { Button, EmptyState, FavoriteToast, GlobalBottomBar, MiniPlayer, Screen, ServerNotice } from '@/components';
import { AppShell } from '@/components/AppShell';
import { setLanguage, t, useTranslation } from '@/i18n';
import { colors } from '@/theme/tokens';
import { useStartupStore } from '@/services/startup';
import { isStreamServerConfigured } from '@/services/catalog/server';
import { ensureAutoBackupScheduled, runAutoBackupIfDue } from '@/storage/backups/autoBackupTask';
import { cleanupUnreferencedLocalAudio } from '@/storage/localAudioCleanup';
import { togglePlay } from '@/services/audio/controller';
import { usePlayerStore } from '@/services/audio/store';
import { OverlayDialogHost } from '@/components/OverlayDialogHost';

void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.warn('[startup] Could not keep the native splash visible', error);
});

export default function RootLayout() {
  useTranslation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashReleased, setSplashReleased] = useState(false);
  const [resetting, setResetting] = useState(false);
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1024;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement
        && (target.isContentEditable || target.closest('input, textarea, select, button, a, [role="button"], [role="textbox"], [contenteditable="true"]'))
      ) return;
      if (!usePlayerStore.getState().queue.items.length) return;
      event.preventDefault();
      void togglePlay();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    void ensureAutoBackupScheduled().catch((backupError: unknown) => {
      console.warn('[backup] Could not register automatic backup', backupError);
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void runAutoBackupIfDue().catch((backupError: unknown) => {
          console.error('[backup] Automatic backup on app resume failed', backupError);
        });
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    setError(null);
    setReady(false);
    (async () => {
      try {
        const db = await getDb(); // abre o banco e roda migrations
        const settings = await settingsRepo.loadSettings(db);
        setLanguage(settings.language);
        useStartupStore.getState().setStreamServerConfigured(isStreamServerConfigured(settings));
        if (alive) {
          setError(null);
          setReady(true);
          void restoreNativeQueue()
            .catch((audioError: unknown) => {
              console.warn('[startup] Audio setup failed; it will be retried when playback starts', audioError);
            })
            .then(() => cleanupUnreferencedLocalAudio())
            .catch((cleanupError: unknown) => {
              console.warn('[startup] Could not clean up unused local audio files', cleanupError);
            });
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : t('app.startFailedGeneric'));
      }
    })();
    return () => { alive = false; };
  }, [attempt]);

  useEffect(() => {
    if (error) {
      void SplashScreen.hideAsync()
        .then(() => setSplashVisible(false))
        .catch((hideError: unknown) => {
          console.warn('[startup] Could not hide the native splash after startup failed', hideError);
          setSplashVisible(false);
        });
      return;
    }
    if (!ready || splashReleased) return;
    void SplashScreen.hideAsync()
      .then(() => setSplashReleased(true))
      .catch((hideError: unknown) => {
        console.warn('[startup] Could not hide the native splash', hideError);
        setSplashReleased(true);
      });
  }, [error, ready, splashReleased]);

  const isMainTab = ['/', '/search', '/library'].includes(pathname);
  const showGlobalBar = !isMainTab && pathname !== '/player' && pathname !== '/settings';
  const showGlobalMiniPlayer = showGlobalBar;

  const retry = () => {
    setSplashVisible(true);
    setSplashReleased(false);
    setAttempt((n) => n + 1);
  };

  // Última saída quando o banco está corrompido: sem isso o app fica preso no
  // erro de inicialização e o usuário precisa desinstalar para voltar a abrir.
  const resetLocalData = () => {
    setResetting(true);
    void resetDatabase()
      .then(() => {
        setResetting(false);
        retry();
      })
      .catch((resetError: unknown) => {
        console.error('[startup] Could not reset the local database', resetError);
        setResetting(false);
        setError(resetError instanceof Error ? resetError.message : t('app.startFailedGeneric'));
      });
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {error ? (
          <Screen>
            <View style={styles.errorBox}>
              <EmptyState message={t('app.startFailed', { error })} />
              <Button label={t('common.retry')} onPress={retry} />
              <Button
                label={t('app.resetData')}
                variant="danger"
                onPress={resetLocalData}
                loading={resetting}
              />
              <Text style={styles.resetHint}>{t('app.resetDataHint')}</Text>
            </View>
          </Screen>
        ) : ready ? (
          <>
            <AppShell>
              <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="player" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="playlist/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="collection/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="library/[kind]" options={{ headerShown: false }} />
                <Stack.Screen name="playlists" options={{ headerShown: false }} />
                <Stack.Screen name="recent" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ title: t('settings.title'), headerShadowVisible: false }} />
              </Stack>
            </AppShell>
            {!desktop && showGlobalMiniPlayer ? <MiniPlayer /> : null}
            {!desktop && showGlobalBar ? <ServerNotice /> : null}
            {!desktop && showGlobalBar ? <GlobalBottomBar /> : null}
            {pathname !== '/player' ? <FavoriteToast lifted={showGlobalBar} /> : null}
            <OverlayDialogHost />
          </>
        ) : null}
        {splashVisible && !error ? (
          <StartupSplash exiting={splashReleased} onComplete={() => setSplashVisible(false)} />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

function StartupSplash({ exiting, onComplete }: { exiting: boolean; onComplete: () => void }) {
  const scale = useRef(new Animated.Value(0.78)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const loop = useRef<Animated.CompositeAnimation | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.84, duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]));
    loop.current = animation;
    animation.start();
    return () => animation.stop();
  }, [scale]);
  
  useEffect(() => {
    if (!exiting) return;
    loop.current?.stop();
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.42, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onCompleteRef.current();
    });
  }, [exiting, opacity, scale]);

  return (
    <Animated.View style={[splashStyles.overlay, { opacity }]}>
      <Animated.Image
        source={require('../../assets/images/LifyIcon.png')}
        resizeMode="contain"
        style={[splashStyles.artwork, { transform: [{ scale }] }]}
      />
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artwork: { width: 300, height: 300 },
});

const styles = StyleSheet.create({
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  resetHint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
