import axios from 'axios';
import { BASE_URL, getSessionToken } from '../config';

export const checkSavedTracks = async (
  trackIds: string[]
): Promise<boolean[]> => {
  try {
    const token = await getSessionToken();

    if (trackIds.length > 50) {
      throw new Error('Cannot check more than 50 track IDs at once.');
    }

    const encodedIds = encodeURIComponent(trackIds.join(','));

    const response = (await axios.get(
      `${BASE_URL}/me/tracks/contains?ids=${encodedIds}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )) as { data: boolean[] };

    return response.data;
  } catch (error) {
    console.error('Error fetching saved tracks data:', error);
    throw error;
  }
};
