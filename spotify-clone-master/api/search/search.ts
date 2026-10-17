import axios from 'axios';

import { AlbumModel, ArtistModel, LibraryItemModel } from '@models';
import {
  AlbumResponseType,
  ArtistResponseType,
  SearchPlaylistResponseType,
} from '@config';
import {
  parseFromSearchPlaylistToCard,
  parseToAlbum,
  parseToArtist,
} from '@utils';

import { BASE_URL, getSessionlessToken } from '../config';

type ResponseType = {
  album: AlbumResponseType;
  playlist: SearchPlaylistResponseType;
  artist: ArtistResponseType;
};

export const search = async ({
  type,
  q,
  limit = 50,
  offset = 0,
  playlistOwnerURI = '',
  nameIncludes = '',
}: {
  type: 'album' | 'playlist' | 'artist';
  // | 'track'
  // | 'show'
  // | 'episode'
  // | 'audiobook'
  q: string;
  limit: number;
  offset: number;
  playlistOwnerURI: string;
  nameIncludes: string;
}): Promise<LibraryItemModel[] | AlbumModel | ArtistModel | null> => {
  try {
    const { token } = await getSessionlessToken();

    const response = await axios.get(`${BASE_URL}/search`, {
      params: { q, type, limit, offset },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (type === 'playlist') {
      return parseFromSearchPlaylistToCard(
        (response as { data: ResponseType['playlist'] }).data,
        playlistOwnerURI,
        nameIncludes
      );
    }

    if (type === 'artist') {
      return parseToArtist((response as { data: ResponseType['artist'] }).data);
    }

    if (type === 'album') {
      return parseToAlbum((response as { data: ResponseType['album'] }).data);
    }

    return null;
  } catch (error) {
    console.error(`Error while searching with a query: ${q}`, error);
    throw error;
  }
};
