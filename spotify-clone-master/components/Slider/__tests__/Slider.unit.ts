describe('Slider', () => {
  // todo
  it.skip('todo', () => {
    expect(jest.fn()).toBe(jest.fn());
  });
});

// import * as React from 'react';
// import { useRouter } from 'expo-router';
// import {
//   fireEvent,
//   render,
//   RenderResult,
//   within,
// } from '@testing-library/react-native';
// import {
//   ArtistRecommendedAlbums,
//   ArtistRecommendedAlbumsPropsType,
// } from '../PlaylistRecommendedAlbums';
// import { translations } from '@data';

// jest.mock('expo-router', () => ({
//   useRouter: jest.fn(),
// }));

// enum TEST_IDS {
//   RECOMMENDED_ALBUMS_SECTION = 'recommended-albums-section',
//   HEADER_TITLE_TEXT = 'header-title-text',
//   HEADER_PRESSABLE_TEXT = 'header-pressable-text',
//   ALBUMS_SCROLL_VIEW = 'albums-scroll-view',
//   ALBUM = 'album',
//   ALBUM_IMAGE = 'album-image',
//   ALBUM_TITLE = 'album-title',
//   ALBUM_RELEASE_DATE = 'album-release-date',
//   ALBUM_ALBUM_TYPE = 'album-album-type',
// }

// describe('ArtistRecommendedAlbums', () => {
//   let container: RenderResult;
//   const mockRouter = jest.fn();
//   const defaultProps: ArtistRecommendedAlbumsPropsType = {
//     artistsAlbums: [
//       {
//         artist: 'Artist name 1 mock',
//         albums: [
//           {
//             type: 'album',
//             id: 'album_id_0',
//             name: 'Album title 1 mock',
//             releaseDate: '2023-10-21',
//             albumType: 'album',
//             images: [
//               { url: 'url 1', width: 1, height: 1 },
//               { url: 'url 2', width: 2, height: 2 },
//               { url: 'url 3', width: 3, height: 3 },
//             ],
//           },
//         ],
//       },
//       {
//         artist: 'Artist name 2 mock',
//         albums: [
//           {
//             type: 'album',
//             id: 'album_id_1',
//             name: 'Album title 1 mock',
//             releaseDate: '2023-10-21',
//             albumType: 'album',
//             imageURL: 'url 1',
//           },
//           {
//             type: 'album',
//             id: 'album_id_2',
//             name: 'Album title 2 mock',
//             releaseDate: '2013-09-14',
//             albumType: 'album',
//             imageURL: 'url 2',
//           },
//         ],
//       },
//     ],
//   };

//   beforeEach(() => {
//     container = render(<ArtistRecommendedAlbums {...defaultProps} />);
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('renders correctly', () => {
//     container
//       .getAllByTestId(TEST_IDS.RECOMMENDED_ALBUMS_SECTION)
//       .forEach((album) => expect(album).toBeTruthy());
//   });

//   describe('UI - Header', () => {
//     it('displays header content for all albums collections', () => {
//       const headerTitleTexts = container.getAllByTestId(
//         TEST_IDS.HEADER_TITLE_TEXT
//       );
//       const headerPressableTexts = container.getAllByTestId(
//         TEST_IDS.HEADER_PRESSABLE_TEXT
//       );

//       const expectedValues = defaultProps.artistsAlbums.map(({ artist }) => ({
//         headerTitleText: `${translations.moreOf} ${artist}`,
//         headerPressableText: translations.showAll,
//       }));

//       expectedValues.forEach((expectedValue, i) => {
//         expect(
//           within(headerTitleTexts[i]).getByText(expectedValue.headerTitleText)
//         ).toBeTruthy();

//         expect(
//           within(headerPressableTexts[i]).getByText(
//             expectedValue.headerPressableText
//           )
//         ).toBeTruthy();
//       });
//     });
//   });

//   describe('UI - ScrollView', () => {
//     it('displays all albums for given artist', () => {
//       const scrollViews = container.getAllByTestId(TEST_IDS.ALBUMS_SCROLL_VIEW);

//       scrollViews.map((scrollView, artistIndex) => {
//         const albums = within(scrollView).getAllByTestId(TEST_IDS.ALBUM);

//         albums.forEach((album, albumIndex) => {
//           const image = within(album).getByTestId(TEST_IDS.ALBUM_IMAGE);
//           const title = within(album).getByTestId(TEST_IDS.ALBUM_TITLE);
//           const releaseDate = within(album).getByTestId(
//             TEST_IDS.ALBUM_RELEASE_DATE
//           );
//           const albumType = within(album).getByTestId(
//             TEST_IDS.ALBUM_ALBUM_TYPE
//           );
//           const expected =
//             defaultProps.artistsAlbums[artistIndex].albums[albumIndex];

//           expect(image.props.source.uri).toEqual(expected.imageURL);
//           expect(within(title).getByText(expected.name)).toBeTruthy();
//           expect(
//             within(releaseDate).getByText(expected.releaseDate)
//           ).toBeTruthy();
//           expect(
//             within(albumType).getByText(
//               translations.type[expected.albumType]
//             )
//           ).toBeTruthy();
//         });
//       });
//     });
//   });

//   describe('Navigation - Press logic', () => {
//     beforeEach(() => {
//       (useRouter as jest.Mock).mockReturnValue({ push: mockRouter });
//       container = render(<ArtistRecommendedAlbums {...defaultProps} />);
//     });

//     it('navigates to first album page of first scroll view with given ID', () => {
//       const firstScrollView = container.getAllByTestId(
//         TEST_IDS.ALBUMS_SCROLL_VIEW
//       )[0];
//       const firstAlbumOfFirstScrollView = within(
//         firstScrollView
//       ).getAllByTestId(TEST_IDS.ALBUM)[0];

//       fireEvent.press(firstAlbumOfFirstScrollView);
//       expect(mockRouter).toHaveBeenCalledWith('/albums/album_id_0');
//     });

//     it('navigates to first album page of second scroll view with given ID', () => {
//       const secondScrollView = container.getAllByTestId(
//         TEST_IDS.ALBUMS_SCROLL_VIEW
//       )[1];
//       const firstAlbumOfSecondScrollView = within(
//         secondScrollView
//       ).getAllByTestId(TEST_IDS.ALBUM)[0];

//       fireEvent.press(firstAlbumOfSecondScrollView);
//       expect(mockRouter).toHaveBeenCalledWith('/albums/album_id_1');
//     });

//     it('navigates to second album page of second scroll view with given ID', () => {
//       const secondScrollView = container.getAllByTestId(
//         TEST_IDS.ALBUMS_SCROLL_VIEW
//       )[1];
//       const secondAlbumOfSecondScrollView = within(
//         secondScrollView
//       ).getAllByTestId(TEST_IDS.ALBUM)[1];

//       fireEvent.press(secondAlbumOfSecondScrollView);
//       expect(mockRouter).toHaveBeenCalledWith('/albums/album_id_2');
//     });
//   });
// });
