import { StyleSheet } from 'react-native';
import { BROWSE_CATEGORY_IMAGE_SIZE, COLORS, Shapes, Sizes } from '@config';
import { hexToRGB } from '@utils';

export const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    height: Sizes.VERY_SMALL,
    borderRadius: Shapes.EDGED_BORDER,
    padding: 16,
    marginTop: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '700',
    color: COLORS.WHITE,
    zIndex: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: hexToRGB(COLORS.BLACK, 0.18),
  },
  imageContainer: {
    elevation: 10,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: -2, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  image: {
    width: BROWSE_CATEGORY_IMAGE_SIZE,
    height: BROWSE_CATEGORY_IMAGE_SIZE,
    borderRadius: Shapes.SQUARE_BORDER,
    transform: [{ rotate: '30deg' }],
    position: 'absolute',
    right: -40,
  },
});
