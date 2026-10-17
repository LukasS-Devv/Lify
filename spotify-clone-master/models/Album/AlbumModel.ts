export type AlbumModel = {
  id: string;
  type: 'album';
  albumType: 'album' | 'single' | 'compilation';
  name: string;
  imageURL: string;
  artists: { type: 'artist'; id: string }[];
  releaseDate: string;
  tracks: {
    total: number;
    items: {
      id: string;
      title: string;
      subtitle: string;
      imageURL?: string;
      explicit?: boolean;
    }[];
  };
  duration: number;
  copyrights: { text: string; type: string }[];
  genres: string[];
  label: string;
};
