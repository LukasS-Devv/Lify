declare global {
  import { StackNavigationProp } from '@react-navigation/stack';
  type RootStackParamList = {
    home: undefined;
    library: undefined;
    search: undefined;
    'album/[id]': { albumId: string };
    'playlist/[id]': { albumId: string };
    'artists/[id]': { artistId: string };
  };

  type AppNavigationProps = StackNavigationProp<RootStackParamList>;
}
export {};
