import * as React from 'react';

import { Preview } from '@components';

import { checkSavedTracks, getAlbum, getArtist } from '@api';
import { AlbumModel, ArtistModel, TrackModel } from '@models';
import { AlbumFallback, ArtistFallback, SEPARATOR } from '@config';
import {
  getDisplayCopyrightText,
  getDisplayDate,
  getDisplayTime,
} from '@utils';
import { translations } from '@data';

export type AlbumScreenPropsType = {
  albumId: string;
};

export const AlbumScreen = ({ albumId }: AlbumScreenPropsType) => {
  const [album, setAlbum] = React.useState<AlbumModel | null>(AlbumFallback);
  const [artists, setArtists] = React.useState<ArtistModel[] | null>(
    ArtistFallback
  );

  React.useEffect(() => {
    (async () => {
      try {
        const albumData = await getAlbum(albumId);
        const savedAlbumTracksArr = await checkSavedTracks(
          albumData.tracks.items.map((track) => track.id)
        );
        setAlbum({
          ...albumData,
          tracks: {
            ...albumData.tracks,
            items: albumData.tracks.items.map((item, i) => ({
              ...item,
              isSaved: savedAlbumTracksArr[i],
            })),
          },
        });

        const artistsData = await Promise.all(
          albumData.artists.map(async ({ id }) => await getArtist(id))
        );
        setArtists(artistsData);
      } catch (error) {
        setAlbum(null);
        setArtists(null);
        console.error('Failed to get album data:', error);
      }
    })();
  }, [albumId]);

  // @API_RATE
  // const artistSeed = React.useMemo(
  //   () =>
  //     artists.length
  //       ? artists
  //           .map((a) => a.id)
  //           .slice(0, 5)
  //           .join(`,`)
  //       : '',
  //   [artists]
  // );
  const id = React.useMemo(() => (album ? album.id : ''), [album]);
  const title = React.useMemo(() => (album ? album.name : ''), [album]);
  const subtitle = React.useMemo(
    () =>
      artists && artists.length
        ? artists.map((a) => a.name).join(` ${SEPARATOR} `)
        : '',
    [artists]
  );
  const imageURL = React.useMemo(() => (album ? album.imageURL : ''), [album]);

  const copyrightTexts = React.useMemo(
    () =>
      album
        ? album.copyrights.map((copyright) =>
            getDisplayCopyrightText(copyright.text, copyright.type)
          )
        : ['', ''],
    [album]
  );
  const info = React.useMemo(
    () =>
      album
        ? `${translations.type[album.albumType]} ${SEPARATOR} ${album.releaseDate.split('-')[0]}`
        : '',
    [album]
  );
  const tracks = React.useMemo(
    () =>
      album
        ? album.tracks.items
        : [
            ...Array(1).fill({
              id: '',
              title: '',
              subtitle: '',
              imageURL: '',
              isSaved: false,
              isPlaying: false,
              isDownloaded: false,
              explicit: false,
            }),
          ],
    [album]
  ) as TrackModel[];
  const infoTexts = React.useMemo(
    () => [
      getDisplayDate(album?.releaseDate),
      `${album?.tracks.total || ''} ${translations.tracks} ${SEPARATOR} ${getDisplayTime(album?.duration || '')}`,
    ],
    [album]
  );

  return (
    <Preview
      type="album"
      id={id}
      imageURL={imageURL}
      headerTitle={title}
      summaryTitle={title}
      summarySubtitle={subtitle}
      summaryInfo={info}
      infoTexts={infoTexts}
      copyrightTexts={copyrightTexts}
      tracks={tracks}
      artists={artists}
    />
  );
};
