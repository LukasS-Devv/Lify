import { StyleSheet } from 'react-native';
import { COLORS } from '@config';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.PRIMARY,
  },
  flatListContentContainer: {
    backgroundColor: COLORS.PRIMARY,
    gap: 6,
  },
  gradientOverlay: {
    zIndex: -2,
  },
});
