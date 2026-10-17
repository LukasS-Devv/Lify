export type TrackModel = {
  id: string;
  title: string;
  subtitle: string;
  imageURL?: string;
  isSaved?: boolean;
  isDownloaded?: boolean;
  isPlaying?: boolean;
  explicit?: boolean;
};
