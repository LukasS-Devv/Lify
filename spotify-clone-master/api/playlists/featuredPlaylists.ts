import axios from 'axios';

import { SavedPlaylistsResponseType } from '@config';
import { parseFromSavedPlaylistsToLibraryItem } from '@utils';
import { LibraryItemModel } from '@models';

import { BASE_URL, getSessionToken } from '../config';

export const getFeaturedPlaylists = async (): Promise<LibraryItemModel[]> => {
  try {
    const token = await getSessionToken();
    const limit = 50;
    const offset = 0;

    const res = (await axios.get(`${BASE_URL}/browse/featured-playlists`, {
      params: {
        limit,
        offset,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as { data: { playlists: SavedPlaylistsResponseType } };

    return parseFromSavedPlaylistsToLibraryItem(res.data.playlists.items);
  } catch (error) {
    console.error(`Error fetching featured playlists`, error);
    throw error;
  }
};
