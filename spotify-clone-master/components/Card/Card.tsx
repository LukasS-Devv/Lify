import * as React from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Foundation from '@expo/vector-icons/Foundation';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { COLORS, Shapes, Sizes } from '@config';
import { styling } from './styles';

export type CardPropsType = {
  id: string;
  type: 'playlist' | 'album' | 'artist' | 'show' | 'episode';
  imageURL?: string;
  title?: string;
  subtitle?: string;
  size?: Sizes;
  shape?: Shapes;
};

const Card = React.memo(
  ({
    id,
    type,
    title,
    subtitle,
    imageURL,
    size = Sizes.BIG,
    shape = Shapes.SQUARE,
  }: CardPropsType) => {
    const router = useRouter();
    const styles = styling(size, shape);
    const pathname = useSegments().slice(0, 2).join('/') as
      | '(tabs)/home'
      | '(tabs)/search'
      | '(tabs)/library';

    const handlePress = React.useCallback(
      (typeID: string) => {
        router.push(`/${pathname}/${type}/${typeID}`);
      },
      [router, type, pathname]
    );

    const renderIcon = React.useCallback(() => {
      switch (type) {
        case 'artist':
          return (
            <FontAwesome name="user" size={size * 0.7} color={COLORS.GREY} />
          );
        case 'album':
        case 'playlist':
          return <Foundation name="music" size={size} color={COLORS.GREY} />;
        case 'show':
        case 'episode':
          return (
            <FontAwesome name="podcast" size={size * 0.7} color={COLORS.GREY} />
          );
        default:
          return (
            <FontAwesome name="user" size={size * 0.7} color={COLORS.GREY} />
          );
      }
    }, [type, size]);

    return (
      <Pressable onPress={() => handlePress(id)} style={styles.card}>
        <View style={styles.cardImageView}>
          <React.Suspense fallback={renderIcon()}>
            {imageURL ? (
              <Image style={styles.cardImage} source={{ uri: imageURL }} />
            ) : (
              renderIcon()
            )}
          </React.Suspense>
        </View>
        {title && (
          <Text numberOfLines={2} style={styles.cardTitleText}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text numberOfLines={!title ? 2 : 1} style={styles.cardSubtitleText}>
            {subtitle}
          </Text>
        )}
      </Pressable>
    );
  }
);
Card.displayName = 'Card';

export { Card };
