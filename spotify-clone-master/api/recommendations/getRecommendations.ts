import axios from 'axios';

import { LibraryItemModel } from '@models';
import { RecommendationsResponseType } from '@config';
import { parseFromTopTracksToLibraryItem } from '@utils';

import { BASE_URL, getSessionlessToken } from '../config';

export const getRecommendations = async ({
  artistSeed = '',
  tracksSeed = '',
  genresSeed = '',
}: {
  artistSeed?: string;
  tracksSeed?: string;
  genresSeed?: string;
}): Promise<LibraryItemModel[]> => {
  //@API_RATE: Remove this and instead handle the rate limit case
  throw new Error('Temp error');
  try {
    const { token } = await getSessionlessToken();

    const response = (await axios.get(`${BASE_URL}/recommendations`, {
      params: {
        seed_artists: artistSeed,
        seed_tracks: tracksSeed,
        seed_genres:
          !artistSeed && !tracksSeed && !genresSeed ? 'Rap' : genresSeed,
        limit: 100,
        offset: 0,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })) as { data: RecommendationsResponseType };

    return parseFromTopTracksToLibraryItem(response.data.tracks);
  } catch (error) {
    console.error(
      `Error when fetching recommendations with seeds - seed_artists: ${artistSeed}, seed_tracks: ${tracksSeed}, seed_genres: ${genresSeed}`,
      error
    );
    throw error;
  }
};
