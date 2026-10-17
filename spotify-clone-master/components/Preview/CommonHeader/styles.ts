import { COLORS, COMMON_HEADER_HEIGHT } from '@config';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
    overflow: 'hidden',
    height: COMMON_HEADER_HEIGHT,
    backgroundColor: 'transparent',
  },
  goBackPressable: {
    ...StyleSheet.absoluteFillObject,
    left: 6,
    width: 32,
    zIndex: 99,
  },
  goBackIcon: {
    fontSize: 32,
    color: COLORS.WHITE,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    height: '100%',
  },
  titleText: {
    color: COLORS.WHITE,
    textAlign: 'center',
    fontFamily: 'SF-Bold',
    fontWeight: 'bold',
    fontSize: 15,
    lineHeight: 15,
    marginBottom: 8,
  },
});
