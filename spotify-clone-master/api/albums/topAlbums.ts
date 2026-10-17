import axios from 'axios';

import { LibraryItemModel } from '@models';
import { UserTopTracksResponseType } from '@config';
import { parseFromTopTracksToLibraryItem } from '@utils';

import { BASE_URL, getSessionToken } from '../config';

export const getUserTopAlbums = async (): Promise<LibraryItemModel[]> => {
  try {
    const token = await getSessionToken();
    const response = (await axios.get(`${BASE_URL}/me/top/tracks`, {
      params: {
        type: 'tracks',
        time_range: 'short_term',
        limit: 50,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as { data: UserTopTracksResponseType };

    return parseFromTopTracksToLibraryItem(response.data.items);
  } catch (error) {
    console.error(
      `Error fetching top albums of top tracks of currently logged in user`,
      error
    );
    throw error;
  }
};
