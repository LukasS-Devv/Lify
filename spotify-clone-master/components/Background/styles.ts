import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -3,
  },
  backgroundBlurredImage: {
    zIndex: -4,
    width: '100%',
    height: '100%',
  },
  backgroundDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -3,
  },
});
