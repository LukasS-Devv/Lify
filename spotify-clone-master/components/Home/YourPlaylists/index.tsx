import * as React from 'react';

import { getSavedPlaylists } from '@api';
import { LibraryItemModel } from '@models';
import { useUserData } from '@context';
import { Shapes, Sizes } from '@config';
import { translations } from '@data';

import { Slider } from '../../Slider';

export const YourPlaylists = () => {
  const [savedPlaylists, setDataSavedPlaylists] = React.useState<
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
  const { userData } = useUserData();

  React.useEffect(() => {
    (async () => {
      try {
        const savedPlaylistsData = await getSavedPlaylists();
        setDataSavedPlaylists(savedPlaylistsData);
      } catch (error) {
        setDataSavedPlaylists(null);
        console.error(error);
      }
    })();
  }, []);

  const userPlaylists = React.useMemo(
    () =>
      !userData
        ? null
        : savedPlaylists
          ? savedPlaylists.filter(
              (savedPlaylist) => savedPlaylist.ownerId === userData.id
            )
          : null,
    [userData, savedPlaylists]
  );

  return (
    <Slider
      title={translations.yourPlaylist}
      slides={userPlaylists}
      size={Sizes.MEDIUM}
      shape={Shapes.SQUARE_BORDER}
      withShowAll={true}
    />
  );
};
