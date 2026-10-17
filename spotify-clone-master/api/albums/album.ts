import axios from 'axios';

import { AlbumModel } from '@models';
import { AlbumResponseType } from '@config';
import { parseToAlbum } from '@utils';

import { BASE_URL, getSessionlessToken } from '../config';

export const getAlbum = async (albumId: string): Promise<AlbumModel> => {
  try {
    const { token } = await getSessionlessToken();

    const response = (await axios.get(`${BASE_URL}/albums/${albumId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as { data: AlbumResponseType };

    return parseToAlbum(response.data);
  } catch (error) {
    console.error(`Error fetching album with an ID: ${albumId}`, error);
    throw error;
  }
};
