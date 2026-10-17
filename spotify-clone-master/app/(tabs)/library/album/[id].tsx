import * as React from 'react';

import { useLocalSearchParams } from 'expo-router';
import { AlbumScreen } from '@screens';

export default function Album() {
  const { id } = useLocalSearchParams();

  return <AlbumScreen albumId={id as string} />;
}
