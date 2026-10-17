import { ImageSourcePropType } from 'react-native';

export const getFallbackImage = (key: string) =>
  (
    ({
      album: require(`@assets/images/disc.png`),
      single: require(`@assets/images/single-note.png`),
      artist: require(`@assets/images/user.png`),
      compilation: require(`@assets/images/note.png`),
      episode: require(`@assets/images/radio.png`),
      playlist: require(`@assets/images/note.png`),
      podcast: require(`@assets/images/radio.png`),
      show: require(`@assets/images/radio.png`),
      track: require(`@assets/images/single-note.png`),
    }) as unknown as { [key: string]: ImageSourcePropType }
  )[key];
