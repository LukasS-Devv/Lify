import * as React from 'react';
import { Text, View } from 'react-native';

import { styles } from './styles';

export type InfoPropsType = {
  infoTexts: string[];
};

export const Info = ({ infoTexts }: InfoPropsType) => (
  <View style={styles.container}>
    {infoTexts.map((text, i) => (
      <Text key={i} style={styles.text}>
        {text}
      </Text>
    ))}
  </View>
);
