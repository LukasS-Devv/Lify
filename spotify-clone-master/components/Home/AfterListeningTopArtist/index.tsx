import * as React from 'react';

import { Slider } from '../../Slider';

import { getRecommendationsFromTopArtistSeed } from '@api';
import { LibraryItemModel } from '@models';
import { Shapes, Sizes } from '@config';
import { translations } from '@data';

export const AfterListeningTopArtist = () => {
  const [topArtistRecommendations, setTopArtistRecommendations] =
    React.useState<{
      recommendations: LibraryItemModel[] | null;
      artist: LibraryItemModel | null;
    }>({
      recommendations: [
        ...Array(3).fill({
          id: '',
          type: 'album',
          title: '',
          imageURL: '',
          subtitle: '',
        }),
      ],
      artist: {
        id: '',
        type: 'album',
        title: '',
        imageURL: '',
        subtitle: '',
      },
    });

  React.useEffect(() => {
    (async () => {
      try {
        const topArtistRecommendationsData =
          await getRecommendationsFromTopArtistSeed();
        setTopArtistRecommendations(topArtistRecommendationsData);
      } catch (error) {
        setTopArtistRecommendations({ recommendations: null, artist: null });
        console.error(error);
      }
    })();
  }, []);

  return (
    <Slider
      title={translations.afterListening(
        topArtistRecommendations.artist?.title || ''
      )}
      slides={topArtistRecommendations.recommendations}
      size={Sizes.MEDIUM}
      shape={Shapes.SQUARE}
      withShowAll={true}
    />
  );
};
