import { UserFollowedArtistsResponseType } from '@config';
import { LibraryItemModel } from '@models';

export const parseFromFollowedArtistsToLibraryItem = (
  data: UserFollowedArtistsResponseType['artists']['items']
): LibraryItemModel[] =>
  data.map(({ id, type, name, images }) => ({
    id: id,
    type: type,
    title: name,
    subtitle: '',
    imageURL: images && images[0] && images[0].url ? images[0].url : '',
  }));
