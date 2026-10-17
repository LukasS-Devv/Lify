import { AlbumModel, ArtistModel } from '@models';

export const AlbumFallback = {
  id: '',
  type: 'album',
  albumType: 'album',
  name: '',
  imageURL: '',
  artists: [{ id: '', type: 'artist' }],
  releaseDate: '2024',
  tracks: {
    total: 10,
    items: [
      ...Array(10).fill({
        id: '',
        title: '',
        subtitle: '',
        explicit: false,
      }),
    ],
  },
  duration: 50000,
  copyrights: [...Array(2).fill({ text: '', type: 'C' })],
  genres: [],
  label: '',
} as AlbumModel;

export const ArtistFallback = [
  ...Array(1).fill({
    type: 'artist',
    id: '',
    name: '',
    imageURL: '',
  }),
] as ArtistModel[];
