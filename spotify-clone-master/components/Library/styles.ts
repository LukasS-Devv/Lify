import { StyleSheet } from 'react-native';
import { COLORS } from '@config';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.PRIMARY,
  },
  scrollView: {
    height: '100%',
    flex: 1,
    flexDirection: 'column',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 16,
  },
  flatList: {
    paddingVertical: 26,
  },
  flatListColumnWrapper: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 12,
  },
});
