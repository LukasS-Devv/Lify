import { Tabs } from 'expo-router';
import { BottomTabBar } from '@navigators';

export default function Layout() {
  return (
    <Tabs tabBar={(props) => <BottomTabBar {...props} />}>
      <Tabs.Screen name="home" options={{ headerShown: false }} />
      <Tabs.Screen name="search" options={{ headerShown: false }} />
      <Tabs.Screen name="library" options={{ headerShown: false }} />
    </Tabs>
  );
}
