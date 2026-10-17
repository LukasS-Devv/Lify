import axios from 'axios';
import * as FileSystem from 'expo-file-system';

import { RecentlyPlayedModel } from '@models';
import { RecentlyPlayedResponseType } from '@config';
import { parseToRecentlyPlayed } from '@utils';

import { BASE_URL, getSessionToken } from '../config';

const fetchRecentlyPlayed = async (): Promise<RecentlyPlayedModel[]> => {
  try {
    const token = await getSessionToken();
    const response = (await axios.get(`${BASE_URL}/me/player/recently-played`, {
      params: {
        limit: 8,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as { data: RecentlyPlayedResponseType };

    return parseToRecentlyPlayed(response.data);
  } catch (error) {
    console.error(
      `Error fetching recently played for currently logged in user`,
      error
    );
    throw error;
  }
};

export const getRecentlyPlayed = async (): Promise<RecentlyPlayedModel[]> => {
  const filename = 'recently_played';
  const fileUri = `${FileSystem.documentDirectory}${filename}.json`;

  try {
    const fileContent = (await FileSystem.readAsStringAsync(fileUri)) || '';

    if (!fileContent) {
      throw new Error(`Error while reading the file: ${fileUri}`);
    }

    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading ${fileUri}`, error);
    throw error;
  }
};

export const updateRecentlyPlayed = async (): Promise<void> => {
  try {
    const currentRecentlyPlayed = await getRecentlyPlayed();
    const newRecentlyPlayed = await fetchRecentlyPlayed();

    if (
      JSON.stringify(currentRecentlyPlayed) ===
      JSON.stringify(newRecentlyPlayed)
    ) {
      return;
    }

    const result = currentRecentlyPlayed.slice();

    newRecentlyPlayed.reverse().forEach((item) => {
      if (currentRecentlyPlayed.some((cItem) => cItem.id === item.id)) {
        result.splice(
          result.findIndex((rItem) => rItem.id === item.id),
          1
        );
      } else {
        result.splice(result.length - 1, 1);
      }
      result.unshift(item);
    });

    const filename = 'recently_played';
    const fileUri = `${FileSystem.documentDirectory}${filename}.json`;

    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(result), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (error) {
    console.error(
      `Error updating old recently played with the new ones in file system`,
      error
    );
    throw error;
  }
};
