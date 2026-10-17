import { RecentlyPlayedResponseType } from '@config';
import { RecentlyPlayedModel } from '@models';

export const parseToRecentlyPlayed = (
  data: RecentlyPlayedResponseType
): RecentlyPlayedModel[] =>
  data.items.map((item) => ({
    id: item.track.album.id,
    title: item.track.name,
    imageURL: item.track.album.images ? item.track.album.images[0].url : '',
  }));
