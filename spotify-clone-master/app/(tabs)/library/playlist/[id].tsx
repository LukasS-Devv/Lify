import * as React from 'react';

import { useLocalSearchParams } from 'expo-router';
import { PlaylistScreen } from '@screens';

export default function Playlist() {
  const { id } = useLocalSearchParams();

  return <PlaylistScreen playlistId={id as string} />;
}
