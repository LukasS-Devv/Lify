import * as React from 'react';

import { Slider } from '../../Slider';

import { getRecommendationsFromArtistSeeds } from '@api';
import { LibraryItemModel } from '@models';
import { Shapes, Sizes } from '@config';
import { translations } from '@data';

export const BasedOnTopArtists = () => {
  const [albumsBasedOnTopArtists, setAlbumsBasedOnTopArtists] = React.useState<
    LibraryItemModel[] | null
  >([
    ...Array(3).fill({
      id: '',
      type: 'album',
      title: '',
      imageURL: '',
      subtitle: '',
    }),
  ]);

  React.useEffect(() => {
    (async () => {
      try {
        const albumsBasedOnTopArtistsData =
          await getRecommendationsFromArtistSeeds();
        setAlbumsBasedOnTopArtists(albumsBasedOnTopArtistsData);
      } catch (error) {
        setAlbumsBasedOnTopArtists(null);
        console.error(error);
      }
    })();
  }, []);

  return (
    <Slider
      title={translations.basedOnYourTopArtists}
      slides={albumsBasedOnTopArtists}
      size={Sizes.MEDIUM}
      shape={Shapes.SQUARE}
      withShowAll={true}
    />
  );
};
