import * as React from 'react';
import { Preview } from '@components';

import { PlaylistModel, TrackModel } from '@models';
import { checkSavedTracks, getPlaylist, getPlaylistItems } from '@api';

export type AlbumScreenPropsType = {
  playlistId: string;
};

export const PlaylistScreen = ({ playlistId }: AlbumScreenPropsType) => {
  const [playlist, setPlaylist] = React.useState<PlaylistModel | null>(null);
  const [tracks, setTracks] = React.useState<TrackModel[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [limit] = React.useState(50);

  const fetchTracks = async () => {
    if (!playlistId || !playlist) {
      return;
    }

    const { total } = playlist.tracks;

    if (total - offset <= 0) {
      return;
    }

    try {
      const newTracks = await getPlaylistItems({
        playlistId,
        limit,
        offset,
      });
      const savedPlaylistTracksArr = await checkSavedTracks(
        newTracks.map((track) => track.id)
      );

      setTracks((prevTracks) => [
        ...prevTracks,
        ...newTracks.map((item, i) => ({
          ...item,
          isSaved: savedPlaylistTracksArr[i],
        })),
      ]);
      setOffset((prevOffset) => prevOffset + limit);
    } catch (error) {
      console.error(error);
    }
  };

  React.useEffect(() => {
    if (!playlistId) {
      return;
    }

    (async () => {
      try {
        const playlistData = await getPlaylist(playlistId);

        setPlaylist(playlistData);
      } catch (error) {
        setPlaylist(null);
        console.error('Failed to get playlist data:', error);
      }
    })();
  }, [playlistId]);

  React.useEffect(() => {
    fetchTracks();

    //eslint-disable-next-line
  }, [playlistId]);

  const id = React.useMemo(() => (playlist ? playlist.id : ''), [playlist]);
  const ownerId = React.useMemo(
    () => (playlist ? playlist.ownerId : ''),
    [playlist]
  );
  const title = React.useMemo(
    () => (playlist ? playlist.title : ''),
    [playlist]
  );
  const subtitle = React.useMemo(
    () => (playlist ? playlist.subtitle : ''),
    [playlist]
  );
  const info = React.useMemo(() => (playlist ? playlist.info : ''), [playlist]);
  const imageURL = React.useMemo(
    () => (playlist ? playlist.imageURL : ''),
    [playlist]
  );
  // @API_RATE
  // const recommendationSeed = React.useMemo(
  //   () =>
  //     tracks
  //       .slice(0, 5)
  //       .map(({ id }) => id)
  //       .join(','),
  //   [tracks]
  // );

  return (
    <Preview
      type="playlist"
      id={id}
      ownerId={ownerId}
      imageURL={imageURL}
      headerTitle={title}
      summaryTitle={title}
      summarySubtitle={subtitle}
      summaryInfo={info}
      tracks={tracks}
      fetchTracks={fetchTracks}
    />
  );
};
