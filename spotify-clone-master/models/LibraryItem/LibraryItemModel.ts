export type LibraryItemModel = {
  id: string;
  type: 'artist' | 'album' | 'show' | 'playlist';
  title: string;
  imageURL: string;
  subtitle: string;
  ownerId?: string;
};
