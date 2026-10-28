import { Innertube } from 'youtubei.js/react-native';

export interface CatalogClient {
  music: {
    search(query: string, options: { type: 'song' | 'artist' }): Promise<any>;
    getArtist(id: string): Promise<any>;
    getAlbum(id: string): Promise<any>;
    getPlaylist(id: string): Promise<any>;
    getSearchSuggestions(query: string): Promise<any>;
    getUpNext(videoId: string, isMusic: boolean): Promise<any>;
  };
}

export async function createCatalogClient(): Promise<CatalogClient> {
  return Innertube.create({
    retrieve_player: true,
    generate_session_locally: true,
  });
}
