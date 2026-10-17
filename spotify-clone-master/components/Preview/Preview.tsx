import * as React from 'react';
import { View } from 'react-native';

import { ArtistModel, TrackModel } from '@models';
import { useApplicationDimensions } from '@hooks';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { CommonHeader } from './CommonHeader';
import { Cover } from './Cover';
import { Summary } from './Summary';
import { Track } from './Track';
import { Info } from './Info';
import { Artists } from './Artists';
import { MoreOf } from './MoreOf';
import { Copyrights } from './Copyrights';
import { Recommendations } from '../Recommendations';
import { EmptySection } from '../EmptySection';

import { BOTTOM_NAVIGATION_HEIGHT } from '@config';

import { styles } from './styles';
import { useUserData } from '@context';

export type PreviewPropsType = {
  type: 'playlist' | 'album';
  id: string;
  ownerId?: string;
  imageURL: string;
  headerTitle: string;
  summaryTitle: string;
  summarySubtitle: string;
  summaryInfo: string;
  infoTexts?: string[];
  copyrightTexts?: string[];
  tracks?: TrackModel[];
  fetchTracks?: () => void;
  artists?: ArtistModel[] | null;
  recommendationsType?: 'tracks' | 'artists';
  recommendationsSeed?: string;
};

export const Preview = ({
  type,
  id,
  ownerId,
  imageURL,
  headerTitle,
  summaryTitle,
  summarySubtitle,
  summaryInfo,
  infoTexts,
  copyrightTexts,
  tracks,
  fetchTracks,
  artists,
  recommendationsSeed,
}: PreviewPropsType) => {
  const { userData } = useUserData();
  const { width, height } = useApplicationDimensions();
  const scrollOffset = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  const renderItem = React.useCallback(
    ({ item, index }: { item: TrackModel; index: number }) => (
      <Track
        type={type}
        key={index}
        title={item.title}
        subtitle={item.subtitle}
        imageURL={item.imageURL}
        isDownloaded={!!item.isDownloaded}
        isSaved={!!item.isSaved}
        isPlaying={!!item.isPlaying}
        explicit={!!item.explicit}
        forceDisableSaveIcon={!!(ownerId && ownerId === userData.id)}
      />
    ),
    [type, ownerId, userData.id]
  );

  return (
    <View style={[styles.container, { width }]}>
      <CommonHeader
        type={type}
        title={headerTitle}
        imageURL={imageURL}
        animatedValue={scrollOffset}
      />
      <Animated.FlatList
        contentContainerStyle={styles.flatListContentContainer}
        style={{
          height: height - BOTTOM_NAVIGATION_HEIGHT,
        }}
        data={tracks}
        keyExtractor={({ id }, index) => id + index}
        renderItem={renderItem}
        disableScrollViewPanResponder
        {...(fetchTracks && {
          onStartReached: fetchTracks,
          onStartReachedThreshold: 1,
        })}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        ListHeaderComponent={
          <>
            <Cover
              type={type}
              imageURL={imageURL}
              animatedValue={scrollOffset}
            />
            <Summary
              id={id}
              type={type}
              title={summaryTitle}
              subtitle={summarySubtitle}
              info={summaryInfo}
              forceDisableSaveIcon={!!(ownerId && ownerId === userData.id)}
            />
          </>
        }
        ListFooterComponent={
          <>
            {infoTexts && <Info infoTexts={infoTexts} />}
            {artists && <Artists artists={artists} />}
            {artists && <MoreOf artists={artists} />}
            {recommendationsSeed && (
              <Recommendations type="artist" seed={recommendationsSeed} />
            )}
            {copyrightTexts && <Copyrights copyrightTexts={copyrightTexts} />}
            <EmptySection />
          </>
        }
      />
    </View>
  );
};
