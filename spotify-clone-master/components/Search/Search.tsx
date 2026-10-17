import * as React from 'react';
import { Text, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { BrowseCategory } from './BrowseCategory';

import { getBrowseCategories } from '@api';
import { BrowseCategoryModel } from '@models';
import { useApplicationDimensions } from '@hooks';
import { BOTTOM_NAVIGATION_HEIGHT, HEADER_HEIGHT } from '@config';

import { styles } from './styles';
import { translations } from '@data';

export const Search = () => {
  const [browseCategories, setBrowseCategories] = React.useState<
    BrowseCategoryModel[] | null
  >([
    ...Array(16).fill({
      id: '',
      title: '',
      imageURL: '',
    }),
  ]);
  const { width, height } = useApplicationDimensions();
  const numColumns = 2;
  const initRenderAmount = 26;
  const maxRenderPerBatchAmount = 26;
  const outsideOfVisibleAreKeptInMemoryAmount = 22;

  React.useEffect(() => {
    (async () => {
      try {
        const browseCategoriesData = await getBrowseCategories();
        setBrowseCategories(browseCategoriesData);
      } catch (error) {
        setBrowseCategories(null);
        console.error(error);
      }
    })();
  }, []);

  const renderItem = React.useCallback(
    ({ item, index }: { item: BrowseCategoryModel; index: number }) => (
      <BrowseCategory key={index} {...item} />
    ),
    []
  );

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height: height - BOTTOM_NAVIGATION_HEIGHT - HEADER_HEIGHT,
        },
      ]}
    >
      <FlatList
        data={browseCategories}
        renderItem={renderItem}
        keyExtractor={(_, i) => i.toString()}
        initialNumToRender={initRenderAmount}
        maxToRenderPerBatch={maxRenderPerBatchAmount}
        windowSize={outsideOfVisibleAreKeptInMemoryAmount}
        contentContainerStyle={styles.flatList}
        columnWrapperStyle={styles.flatListColumnWrapper}
        numColumns={numColumns}
        style={styles.scrollView}
        ListHeaderComponent={
          <Text style={styles.headerText}>{translations.browseAll}</Text>
        }
      />
    </View>
  );
};
