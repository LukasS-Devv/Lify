import * as React from 'react';
import { Text, View } from 'react-native';

import { styles } from './styles';

export type ErrorBoxPropsType = { message: string; size: [number, number] };

export const ErrorBox = ({
  message,
  size: [width, height],
}: ErrorBoxPropsType) => {
  return (
    <View style={[styles.container, { width, height }]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};
