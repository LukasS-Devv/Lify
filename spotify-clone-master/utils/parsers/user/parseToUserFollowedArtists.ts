import { ArtistResponseType } from '@config';
import { ArtistModel } from '@models';

export const parseToUserFollowedArtists = (
  data: ArtistResponseType[]
): ArtistModel[] =>
  data.map(({ type, id, name, images }) => ({
    type: type,
    id: id,
    name: name,
    imageURL: images && images[0] && images[0].url ? images[0].url : '',
  }));
