import axios from 'axios';

import { SavedAlbumsResponseType } from '@config';
import { parseFromSavedAlbumsToLibraryItem } from '@utils';
import { LibraryItemModel } from '@models';

import { BASE_URL, getSessionToken, fileSystemMiddleware } from '../config';

export const checkSavedAlbums = async (
  albumIds: string[]
): Promise<boolean[]> => {
  try {
    const token = await getSessionToken();

    if (albumIds.length > 50) {
      throw new Error('Cannot check more than 50 album IDs at once.');
    }

    const encodedIds = encodeURIComponent(albumIds.join(','));

    const response = (await axios.get(
      `${BASE_URL}/me/albums/contains?ids=${encodedIds}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )) as { data: boolean[] };

    return response.data;
  } catch (error) {
    console.error('Error fetching saved albums data:', error);
    throw error;
  }
};

export const getSavedAlbums = async (
  offset: number = 0,
  numberOfCalls: number = 0
): Promise<LibraryItemModel[]> => {
  try {
    const maxAllowedLimit = 50;
    const token = await getSessionToken();

    const response = (await axios.get(`${BASE_URL}/me/albums`, {
      params: {
        limit: maxAllowedLimit,
        offset: offset,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as { data: SavedAlbumsResponseType };

    const { total } = response.data;
    const numberOfMaxCalls = Math.ceil(total / maxAllowedLimit) - 1;
    const result = parseFromSavedAlbumsToLibraryItem(response.data.items);
    if (total / maxAllowedLimit <= 1 || numberOfCalls >= numberOfMaxCalls) {
      return result;
    }

    numberOfCalls++;
    offset += maxAllowedLimit;
    const next = await getSavedAlbums(offset, numberOfCalls);

    return [...result, ...next];
  } catch (error) {
    console.error(
      `Error fetching saved albums of currently logged in user`,
      error
    );
    throw error;
  }
};

// eslint-disable-next-line
const getSavedAlbumsFileSystem = async () =>
  await fileSystemMiddleware<LibraryItemModel[]>(
    'user_saved_albums',
    getSavedAlbums
  );
