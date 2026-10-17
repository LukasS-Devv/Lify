import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb, settingsRepo } from '@/database';
import { setupAudio } from '@/services/audio/controller';
import { Button, EmptyState, GlobalBottomBar, MiniPlayer, Screen, ServerNotice } from '@/components';
import { setLanguage, t, useTranslation } from '@/i18n';
import { colors } from '@/theme/tokens';
import { useStartupStore } from '@/services/startup';
import { isStreamServerConfigured } from '@/services/catalog/server';

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
  const hasLoadedHome = useStartupStore((state) => state.hasLoadedHome);
  const pathname = usePathname();

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
          void setupAudio().catch((audioError: unknown) => {
            console.warn('[startup] Audio setup failed; it will be retried when playback starts', audioError);
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
    if (!ready || !hasLoadedHome || splashReleased) return;
    void SplashScreen.hideAsync()
      .then(() => setSplashReleased(true))
      .catch((hideError: unknown) => {
        console.warn('[startup] Could not hide the native splash', hideError);
        setSplashReleased(true);
      });
  }, [error, hasLoadedHome, ready, splashReleased]);

  const isMainTab = ['/', '/search', '/library'].includes(pathname);
  const showGlobalBar = !isMainTab && pathname !== '/player' && pathname !== '/settings';
  const showGlobalMiniPlayer = showGlobalBar;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {error ? (
          <Screen>
            <EmptyState message={t('app.startFailed', { error })} />
            <Button label={t('common.retry')} onPress={() => {
              setSplashVisible(true);
              setSplashReleased(false);
              setAttempt((n) => n + 1);
            }} />
          </Screen>
        ) : ready ? (
          <>
            <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="player" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="playlist/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="collection/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="playlists" options={{ headerShown: false }} />
              <Stack.Screen name="recent" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ title: t('settings.title'), headerShadowVisible: false }} />
            </Stack>
            {showGlobalMiniPlayer ? <MiniPlayer /> : null}
            {showGlobalBar ? <ServerNotice /> : null}
            {showGlobalBar ? <GlobalBottomBar /> : null}
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
