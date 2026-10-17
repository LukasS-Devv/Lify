import { StyleSheet } from 'react-native';
import { COLORS, Shapes, Sizes } from '@config';

export const styling = (size: Sizes, shape: Shapes) =>
  StyleSheet.create({
    card: {
      width: size,
      marginVertical: 8,
    },
    cardImageView: {
      overflow: 'hidden',
      position: 'relative',
      width: size,
      height: size,
      borderRadius: shape,
      backgroundColor: COLORS.SECONDARY,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardImage: {
      ...StyleSheet.absoluteFillObject,
      color: COLORS.GREY,
    },
    cardTitleText: {
      fontSize: 13,
      lineHeight: 13,
      fontFamily: 'SF-Bold',
      color: COLORS.WHITE,
      maxWidth: size,
      marginTop: 10,
    },
    cardSubtitleText: {
      flexDirection: 'row',
      marginTop: 5,
      fontSize: 13,
      lineHeight: 13,
      fontFamily: 'SF-Regular',
      color: COLORS.LIGHT_GREY,
    },
  });
