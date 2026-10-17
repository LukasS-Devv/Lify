import { Stack } from 'expo-router';

export default function LibraryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, headerShadowVisible: false }}>
      <Stack.Screen
        name="index"
        options={{ headerShown: false, animation: 'default' }}
      />
      <Stack.Screen
        name="playlist"
        options={{ headerShown: false, animation: 'default' }}
      />
      <Stack.Screen
        name="album"
        options={{ headerShown: false, animation: 'default' }}
      />
      <Stack.Screen
        name="artist"
        options={{ headerShown: false, animation: 'default' }}
      />
      <Stack.Screen
        name="episode"
        options={{ headerShown: false, animation: 'default' }}
      />
      <Stack.Screen
        name="show"
        options={{ headerShown: false, animation: 'default' }}
      />
    </Stack>
  );
}
