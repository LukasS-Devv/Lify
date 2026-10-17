import * as React from 'react';
import { Text, View } from 'react-native';

import { Image } from 'expo-image';
import { useApplicationDimensions } from '@hooks';

import { styles } from './styles';
import { getRandomColor } from '@utils';

export type BrowseCategoryPropsType = {
  id: string;
  title: string;
  imageURL: string;
};

export const BrowseCategory = ({
  //eslint-disable-next-line
  id,
  title,
  imageURL,
}: BrowseCategoryPropsType) => {
  // TODO: add route for Category and change view to link with id
  const { width } = useApplicationDimensions();
  const backgroundColor = getRandomColor();

  return (
    <View
      style={[
        styles.container,
        { width: width / 2 - 8 * 2.5, backgroundColor },
      ]}
    >
      <View style={styles.overlay} />
      <Text style={styles.text}>{title}</Text>
      {imageURL && (
        <View style={styles.imageContainer}>
          <Image source={imageURL} style={styles.image} />
        </View>
      )}
    </View>
  );
};
