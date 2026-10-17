import * as React from 'react';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useFonts } from 'expo-font';

import { LibrarySelectedCategoryProvider, UserDataProvider } from '@context';

import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'SF-Regular': require('@assets/fonts/SF-Pro-Display-Regular.otf'),
    'SF-Semibold': require('@assets/fonts/SF-Pro-Display-Semibold.otf'),
    'SF-Thin': require('@assets/fonts/SF-Pro-Display-Thin.otf'),
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <UserDataProvider>
        <LibrarySelectedCategoryProvider>
          <GestureHandlerRootView style={styles.gestureHandlerRootView}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen
                name="index"
                options={{ headerShown: false, animation: 'fade' }}
              />
              <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false, animation: 'fade' }}
              />
              <Stack.Screen
                name="+not-found"
                options={{ headerShown: false, animation: 'fade' }}
              />
            </Stack>
            <StatusBar style="light" />
          </GestureHandlerRootView>
        </LibrarySelectedCategoryProvider>
      </UserDataProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gestureHandlerRootView: { flex: 1 },
});
