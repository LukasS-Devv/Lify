import * as React from 'react';

import { Slider } from '../../Slider';

import { ArtistModel, LibraryItemModel } from '@models';
import { Shapes, Sizes } from '@config';
import { translations } from '@data';

import { getArtistAlbums } from '@api';

export type MoreOfPropsType = {
  artists: ArtistModel[] | null;
};

export const MoreOf = ({ artists }: MoreOfPropsType) => {
  const [artistsAlbums, setArtistsAlbums] = React.useState<
    {
      artist: string;
      albums: LibraryItemModel[] | null;
    }[]
  >([
    {
      artist: '',
      albums: [
        ...Array(3).fill({
          id: '',
          type: 'album',
          title: '',
          imageURL: '',
          subtitle: '',
        }),
      ],
    },
  ]);

  const checkArtistIDisEmpty = React.useMemo(
    () => artists && artists.some((artist) => !artist.id),
    [artists]
  );

  React.useEffect(() => {
    if (!artists || checkArtistIDisEmpty) {
      return;
    }

    (async () => {
      try {
        const artistsAlbumsData = (
          await Promise.all(
            artists.map(
              async ({ id }) =>
                await getArtistAlbums(id, 'album,compilation', 10)
            )
          )
        ).map((albums, i) => ({ artist: artists[i].name, albums: albums }));
        setArtistsAlbums(artistsAlbumsData);
      } catch (error) {
        setArtistsAlbums([{ artist: '', albums: null }]);
        console.error("Failed to get artist's album data:", error);
      }
    })();
  }, [checkArtistIDisEmpty, artists]);

  return artistsAlbums.map(({ artist, albums }, index) => (
    <Slider
      key={index}
      title={`${translations.moreOf} ${artist}`}
      slides={albums}
      size={Sizes.MEDIUM}
      shape={Shapes.SQUARE_BORDER}
      withShowAll={true}
    />
  ));
};
