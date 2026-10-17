import { LibraryItemModel } from '@models';
import { getRecommendations } from './getRecommendations';
import { getUserTopArtists } from '../artists';

export const getRecommendationsFromArtistSeeds = async (): Promise<
  LibraryItemModel[]
> => {
  try {
    const artistSeed = (await getUserTopArtists())
      .map((item) => item.id)
      .slice(0, 5)
      .join(',');

    return await getRecommendations({ artistSeed });
  } catch (error) {
    console.error(
      `Error when fetching recommended tracks from artists seeds`,
      error
    );
    throw error;
  }
};
