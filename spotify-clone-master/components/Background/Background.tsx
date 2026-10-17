import * as React from 'react';
import { Image, View as Overlay, View } from 'react-native';

import { getFallbackImage, hexToRGB } from '@utils';
import { COLORS } from '@config';

import { styles } from './styles';

export type BackgroundPropsType = {
  type: 'album' | 'playlist';
  imageURL: string;
  darkness?: number;
};

export const Background = ({
  type,
  imageURL,
  darkness = 0,
}: BackgroundPropsType) => {
  const fallbackImageSource = React.useMemo(
    () => getFallbackImage(type),
    [type]
  );

  return (
    <View style={styles.background}>
      <Overlay
        style={[
          styles.backgroundDarkOverlay,
          { backgroundColor: hexToRGB(COLORS.PRIMARY, darkness) },
        ]}
      />
      {imageURL && (
        <Image
          blurRadius={100}
          style={styles.backgroundBlurredImage}
          source={imageURL ? { uri: imageURL } : fallbackImageSource}
          resizeMode="cover"
        />
      )}
    </View>
  );
};
