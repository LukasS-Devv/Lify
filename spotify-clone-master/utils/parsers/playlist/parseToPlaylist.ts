import { PlaylistResponseType, SEPARATOR } from '@config';
import { translations } from '@data';
import { PlaylistModel } from '@models';
import { getDisplayTime } from '../../common';

export const parseToPlaylist = ({
  type,
  id,
  name,
  description,
  owner,
  followers,
  tracks,
  images,
}: PlaylistResponseType): PlaylistModel => ({
  type: type,
  id: id,
  title: name,
  description: description,
  subtitle: owner.display_name,
  ownerId: owner.id,
  info: `${followers.total.toLocaleString()} ${translations.saves} ${SEPARATOR} ${getDisplayTime(tracks.items.reduce((a, b) => a + b.track.duration_ms, 0))}`,
  imageURL: images !== null ? images[0].url : '',
  tracks: { total: tracks.total },
});
