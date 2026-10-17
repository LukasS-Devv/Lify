import { UserTopArtistsResponseType } from '@config';
import { LibraryItemModel } from '@models';

export const parseFromTopArtistsToLibraryItem = (
  data: UserTopArtistsResponseType
): LibraryItemModel[] =>
  data.items.map(({ id, type, name, images }) => ({
    id: id,
    type: type,
    title: name,
    subtitle: '',
    imageURL: images !== null && images[0].url ? images[0].url : '',
  }));
