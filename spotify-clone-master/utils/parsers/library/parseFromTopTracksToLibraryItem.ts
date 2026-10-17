import { UserTopTracksResponseType } from '@config';
import { LibraryItemModel } from '@models';

export const parseFromTopTracksToLibraryItem = (
  data: UserTopTracksResponseType['items']
): LibraryItemModel[] =>
  data
    .map(({ album: { id, type, name, artists, images } }) => ({
      id: id,
      type: type,
      title: name,
      subtitle: artists.map((artist) => artist.name).join(', '),
      imageURL: images && images[0] && images[0].url ? images[0].url : '',
    }))
    .filter(
      (obj1, i, arr) => arr.findIndex((obj2) => obj2.id === obj1.id) === i
    );
