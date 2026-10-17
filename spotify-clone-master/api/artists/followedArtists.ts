import axios from 'axios';

import { LibraryItemModel } from '@models';
import { UserFollowedArtistsResponseType } from '@config';
import { parseFromFollowedArtistsToLibraryItem } from '@utils';

import { BASE_URL, fileSystemMiddleware, getSessionToken } from '../config';

export const getUserFollowedArtists = async (
  after: string = '',
  numberOfCalls: number = 0
): Promise<LibraryItemModel[]> => {
  try {
    const maxAllowedLimit = 50;
    const token = await getSessionToken();

    const response = (await axios.get(`${BASE_URL}/me/following`, {
      params: {
        type: 'artist',
        limit: maxAllowedLimit,
        ...(after ? { after } : {}),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as {
      data: UserFollowedArtistsResponseType;
    };

    const { total } = response.data.artists;
    const numberOfMaxCalls = Math.ceil(total / maxAllowedLimit) - 1;
    const result = parseFromFollowedArtistsToLibraryItem(
      response.data.artists.items
    );

    if (total / maxAllowedLimit <= 1 || numberOfCalls >= numberOfMaxCalls) {
      return result;
    }

    numberOfCalls++;

    const next = await getUserFollowedArtists(
      response.data.artists.cursors.after,
      numberOfCalls
    );

    return [...result, ...next];
  } catch (error) {
    console.error(`Error followed artists of currently logged in user`, error);
    throw error;
  }
};

// eslint-disable-next-line
const getUserFollowedArtistsFromFileSystem = async () =>
  await fileSystemMiddleware<LibraryItemModel[]>(
    'user_followed_artists',
    getUserFollowedArtists
  );
