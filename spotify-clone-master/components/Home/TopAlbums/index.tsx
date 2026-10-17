import * as React from 'react';

import { Slider } from '../../Slider';

import { getUserTopAlbums } from '@api';
import { LibraryItemModel } from '@models';
import { Shapes, Sizes } from '@config';
import { translations } from '@data';

export type TopAlbumsPropsType = {};

export const TopAlbums = () => {
  const [topAlbums, setTopAlbums] = React.useState<LibraryItemModel[] | null>([
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
        const topAlbumsData = await getUserTopAlbums();
        setTopAlbums(topAlbumsData);
      } catch (error) {
        setTopAlbums(null);
        console.error(error);
      }
    })();
  }, []);

  return (
    <Slider
      title={translations.yourTopAlbums(topAlbums?.length || '')}
      slides={topAlbums}
      size={Sizes.MEDIUM}
      shape={Shapes.SQUARE_BORDER}
      withShowAll={true}
    />
  );
};
