import * as React from 'react';

import { getFeaturedPlaylists } from '@api';
import { LibraryItemModel } from '@models';
import { Shapes, Sizes } from '@config';
import { translations } from '@data';

import { Slider } from '../../Slider';

export const FeaturedPlaylists = () => {
  const [featuredPlaylists, setDataFeaturedPlaylists] = React.useState<
    LibraryItemModel[] | null
  >([
    ...Array(3).fill({
      id: '',
      type: 'playlist',
      title: '',
      imageURL: '',
      subtitle: '',
    }),
  ]);

  React.useEffect(() => {
    (async () => {
      try {
        const featuredPlaylistsData = await getFeaturedPlaylists();
        setDataFeaturedPlaylists(featuredPlaylistsData);
      } catch (error) {
        setDataFeaturedPlaylists(null);
        console.error(error);
      }
    })();
  }, []);

  return (
    <Slider
      title={translations.featuredPlaylists}
      slides={featuredPlaylists}
      size={Sizes.MEDIUM}
      shape={Shapes.SQUARE_BORDER}
      withShowAll={true}
    />
  );
};
