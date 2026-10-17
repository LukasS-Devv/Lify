import { StyleSheet } from 'react-native';
import { COLORS, COVER_SIZE } from '@config';

export const styles = StyleSheet.create({
  imageBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: COVER_SIZE + 250,
  },
  image: {
    marginVertical: 30,
    marginHorizontal: 'auto',
    paddingBottom: 30,
    width: COVER_SIZE,
    height: COVER_SIZE,
    zIndex: 2,
    elevation: 20,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    height: COVER_SIZE + 250,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    top: COVER_SIZE + 30 * 8,
    height: COVER_SIZE,
    left: -40,
    backgroundColor: COLORS.PRIMARY,
    elevation: 20,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: -40 },
    shadowOpacity: 1,
    shadowRadius: 15,
    zIndex: 1,
  },
});
