import * as React from 'react';
import { ScrollView } from 'react-native-gesture-handler';

import { RecentlyPlayed } from './RecentlyPlayed';
import { TopAlbums } from './TopAlbums';
import { TopArtists } from './TopArtists';
// import { BasedOnTopArtists } from './BasedOnTopArtists';
import { YourPlaylists } from './YourPlaylists';
import { FeaturedPlaylists } from './FeaturedPlaylists';
// import { AfterListeningTopArtist } from './AfterListeningTopArtist';
import { EmptySection } from '../EmptySection';
import { BOTTOM_NAVIGATION_HEIGHT, COLORS, HEADER_HEIGHT } from '@config';
import { View } from 'react-native';
import { useApplicationDimensions } from '@hooks';

export const Home = () => {
  const { height } = useApplicationDimensions();
  return (
    <View
      style={{
        backgroundColor: COLORS.PRIMARY,
        height: height - BOTTOM_NAVIGATION_HEIGHT - HEADER_HEIGHT,
      }}
    >
      <ScrollView style={{ paddingVertical: 16 }}>
        <RecentlyPlayed />
        <TopAlbums />
        <TopArtists />
        {/* @API_RATE */}
        {/* <BasedOnTopArtists /> */}
        <YourPlaylists />
        <FeaturedPlaylists />
        {/* @API_RATE */}
        {/* <AfterListeningTopArtist /> */}
        <EmptySection />
      </ScrollView>
    </View>
  );
};
