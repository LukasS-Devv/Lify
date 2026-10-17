import { LibraryItemModel } from '@models';
import { AlbumTypes, SavedAlbumsResponseType, SEPARATOR } from '@config';
import { translations } from '@data';

export const parseFromSavedAlbumsToLibraryItem = (
  data: {
    album: SavedAlbumsResponseType['items'][0]['album'];
  }[]
): LibraryItemModel[] =>
  data.map(({ album: { artists, type, id, name, album_type, images } }) => {
    const artistsString = artists.map((artist) => artist.name).join(', ');

    return {
      type: type,
      id: id,
      title: name,
      subtitle:
        album_type === AlbumTypes.ALBUM
          ? artistsString
          : `${translations.type[album_type]} ${SEPARATOR} ${artistsString}`,
      imageURL: images && images[0] && images[0].url ? images[0].url : '',
    };
  });
