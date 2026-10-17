import axios from 'axios';

import { ArtistModel } from '@models';
import { ArtistResponseType } from '@config';
import { parseToArtist } from '@utils';

import { BASE_URL, getSessionlessToken } from '../config';

export const getArtist = async (artistId: string): Promise<ArtistModel> => {
  try {
    const { token } = await getSessionlessToken();

    const response = (await axios.get(`${BASE_URL}/artists/${artistId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as { data: ArtistResponseType };

    return parseToArtist(response.data);
  } catch (error) {
    console.error(`Error fetching artist with an ID: ${artistId}`, error);
    throw error;
  }
};
