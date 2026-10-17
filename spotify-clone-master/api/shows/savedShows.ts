import axios from 'axios';

import { SavedEpisodesResponseType } from '@config';
import { parseFromSavedShowsToLibraryItem } from '@utils';
import { LibraryItemModel } from '@models';

import { BASE_URL, fileSystemMiddleware, getSessionToken } from '../config';

export const getSavedShows = async (
  offset: number = 0,
  numberOfCalls: number = 0
): Promise<LibraryItemModel[]> => {
  try {
    const maxAllowedLimit = 50;
    const token = await getSessionToken();

    const response = (await axios.get(`${BASE_URL}/me/episodes`, {
      params: {
        limit: maxAllowedLimit,
        offset: offset,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as { data: SavedEpisodesResponseType };

    const { total } = response.data;
    const numberOfMaxCalls = Math.ceil(total / maxAllowedLimit) - 1;
    const result = parseFromSavedShowsToLibraryItem(response.data.items);
    if (total / maxAllowedLimit <= 1 || numberOfCalls >= numberOfMaxCalls) {
      return result;
    }

    numberOfCalls++;
    offset += maxAllowedLimit;
    const next = await getSavedShows(offset, numberOfCalls);

    return [...result, ...next];
  } catch (error) {
    console.error(
      `Error fetching saved shows of currently logged in user`,
      error
    );
    throw error;
  }
};

// eslint-disable-next-line
const getSavedShowsFromFileSystem = async () =>
  await fileSystemMiddleware<LibraryItemModel[]>(
    'user_saved_shows',
    getSavedShows
  );
