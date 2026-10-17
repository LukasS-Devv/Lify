import * as React from 'react';
import { Text, View } from 'react-native';

import { styles } from './styles';

export type CopyrightsPropsType = {
  copyrightTexts: string[];
};

export const Copyrights = ({ copyrightTexts }: CopyrightsPropsType) => {
  return (
    <View style={styles.view}>
      {copyrightTexts.map((text, index) => (
        <Text
          key={index}
          style={styles.text}
          testID={`copyright-text-${index}`}
        >
          {text}
        </Text>
      ))}
    </View>
  );
};
