import { SearchPlaylistResponseType } from '@config';
import { LibraryItemModel } from '@models';

export const parseFromSearchPlaylistToCard = (
  data: SearchPlaylistResponseType,
  ownerURI: string = '',
  nameIncludes: string = ''
): LibraryItemModel[] =>
  data.playlists.items
    .filter(
      (playlist) =>
        (ownerURI ? playlist.owner.uri === ownerURI : true) &&
        (nameIncludes ? playlist.name.includes(nameIncludes) : true)
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({
      id: item.id,
      type: item.type,
      title: '',
      subtitle:
        item.description || item.name || item.owner.display_name + "'sPlaylist",
      imageURL: item.images && item.images[0].url ? item.images[0].url : '',
    }));
