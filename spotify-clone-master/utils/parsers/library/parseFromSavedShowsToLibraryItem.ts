import { LibraryItemModel } from '@models';
import { SavedEpisodesResponseType } from '@config';
import { translations } from '@data';
import { getDisplayDate } from '../../common';

export const parseFromSavedShowsToLibraryItem = (
  data: {
    episode: SavedEpisodesResponseType['items'][0]['episode'];
  }[]
): LibraryItemModel[] =>
  data.map(
    ({
      episode: {
        release_date,
        show: { type, id, name, images },
      },
    }) => ({
      type: type,
      id: id,
      title: name,
      subtitle: translations.released + getDisplayDate(release_date),
      imageURL: images && images[0] && images[0].url ? images[0].url : '',
    })
  );
