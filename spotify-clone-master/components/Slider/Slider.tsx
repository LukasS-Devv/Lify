import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
// import { useRouter } from 'expo-router';

import { Card } from '../Card';

import { translations } from '@data';
import { Shapes, Sizes } from '@config';
import { LibraryItemModel } from '@models';

import { styles } from './styles';
import { ErrorBox } from '../ErrorBox';
import { useApplicationDimensions } from '@hooks';

export type SliderPropsType = {
  title: string;
  slides: LibraryItemModel[] | null;
  size?: Sizes;
  shape?: Shapes;
  withShowAll: boolean;
};

export const Slider = ({
  title,
  slides,
  size = Sizes.BIG,
  shape = Shapes.SQUARE,
  withShowAll = false,
}: SliderPropsType) => {
  const { width } = useApplicationDimensions();
  const horizontalOffset = 16;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: horizontalOffset }]}>
        <Text numberOfLines={1} style={styles.headerTitleText}>
          {title}
        </Text>
        {withShowAll && (
          <Pressable>
            <Text style={styles.headerPressableText}>
              {translations.showAll}
            </Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        style={styles.scrollView}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View
          style={[
            styles.scrollViewContainer,
            { marginHorizontal: horizontalOffset },
          ]}
        >
          {!slides ? (
            <ErrorBox
              message={`Failed to fetch data`}
              size={[width - horizontalOffset * 2, size]}
            />
          ) : (
            slides.map(({ id, type, title, subtitle, imageURL }, index) => (
              <Card
                key={index}
                id={id}
                type={type}
                shape={shape}
                size={size}
                title={title}
                subtitle={subtitle}
                imageURL={imageURL}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};
