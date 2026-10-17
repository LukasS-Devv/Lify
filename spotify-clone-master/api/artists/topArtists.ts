import axios from 'axios';

import { LibraryItemModel } from '@models';
import { UserTopArtistsResponseType } from '@config';
import { parseFromTopArtistsToLibraryItem } from '@utils';

import { BASE_URL, getSessionToken } from '../config';

export const getUserTopArtists = async (): Promise<LibraryItemModel[]> => {
  try {
    const token = await getSessionToken();
    const response = (await axios.get(`${BASE_URL}/me/top/artists`, {
      params: {
        type: 'artists',
        time_range: 'short_term',
        limit: 50,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as { data: UserTopArtistsResponseType };

    return parseFromTopArtistsToLibraryItem(response.data);
  } catch (error) {
    console.error(
      `Error fetching top artists of currently logged in user`,
      error
    );
    throw error;
  }
};
