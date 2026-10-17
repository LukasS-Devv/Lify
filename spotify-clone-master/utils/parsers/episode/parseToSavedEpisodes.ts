import { SavedEpisodesResponseType } from '@config';
import { SavedEpisodeModel } from '@models';

export const parseToSavedEpisodes = (
  data: {
    episode: SavedEpisodesResponseType['items'][0]['episode'];
  }[]
): SavedEpisodeModel[] =>
  data.map(({ episode: { id, type, name, images, release_date } }) => ({
    id: id,
    type: type,
    name: name,
    imageURL: images && images[0] && images[0].url ? images[0].url : '',
    releaseDate: release_date,
  }));
