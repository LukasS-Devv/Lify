import { PlaylistItemResponseType } from '@config';
import { TrackModel } from '@models';

export const parseFromPlaylistItemsToTracks = (
  items: PlaylistItemResponseType[]
): TrackModel[] =>
  items.map(({ track: { id, name, artists, album, explicit } }) => ({
    id: id,
    title: name,
    subtitle: artists.map((a) => a.name).join(', '),
    imageURL: album.images[0].url || '',
    explicit: explicit,
  }));
