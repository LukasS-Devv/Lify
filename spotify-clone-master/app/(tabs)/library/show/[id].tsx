import * as React from 'react';

import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

export default function Show() {
  const { id } = useLocalSearchParams();

  return <Text>{id}</Text>;
}
