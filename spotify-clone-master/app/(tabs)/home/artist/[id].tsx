import * as React from 'react';
import { Text } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

export default function Artist() {
  const { id } = useLocalSearchParams();

  return <Text>{id}</Text>;
}
