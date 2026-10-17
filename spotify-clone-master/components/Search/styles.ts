import { COLORS } from '@config';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.PRIMARY,
  },
  headerText: {
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '700',
    color: COLORS.WHITE,
    marginBottom: 10,
  },
  scrollView: {
    width: '100%',
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
