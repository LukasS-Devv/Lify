import { getUserFollowedArtists } from './artists';
import { getSavedAlbums } from './albums';
import { getSavedShows } from './shows';
import { getSavedPlaylists } from './playlists';

import { fileSystemMiddleware } from './config';
import { LibraryItemModel } from '@models';
import { Categories } from '@config';

export type LibraryType = {
  [Categories.FOLLOWED_ARTISTS]: LibraryItemModel[];
  [Categories.SAVED_ALBUMS]: LibraryItemModel[];
  [Categories.SAVED_PODCASTS]: LibraryItemModel[];
  [Categories.SAVED_PLAYLISTS]: LibraryItemModel[];
  [Categories.DOWNLOADED]: LibraryItemModel[];
  [Categories.ALL]: LibraryItemModel[];
};

export const getLibrary = async (): Promise<LibraryType> => {
  try {
    const [followedArtists, savedAlbums, savedShows, savedPlaylists] =
      await Promise.all([
        await getUserFollowedArtists(),
        await getSavedAlbums(),
        await getSavedShows(),
        await getSavedPlaylists(),
      ]);

    return {
      [Categories.FOLLOWED_ARTISTS]: followedArtists,
      [Categories.SAVED_ALBUMS]: savedAlbums,
      [Categories.SAVED_PODCASTS]: savedShows,
      [Categories.SAVED_PLAYLISTS]: savedPlaylists,
      [Categories.DOWNLOADED]: savedShows,
      [Categories.ALL]: [
        ...savedPlaylists,
        ...followedArtists,
        ...savedAlbums,
        ...savedShows,
      ],
    };
  } catch (error) {
    console.error(`Error fetching library sections`, error);
    throw error;
  }
};

// eslint-disable-next-line
const getLibraryFromFileSystem = async () =>
  await fileSystemMiddleware<LibraryType>('user_library', getLibrary);
