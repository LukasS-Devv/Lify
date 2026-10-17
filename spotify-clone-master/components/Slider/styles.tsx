import { StyleSheet } from 'react-native';
import { COLORS } from '@config';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.PRIMARY,
    paddingTop: 35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitleText: {
    fontSize: 24,
    lineHeight: 24,
    fontFamily: 'SF-Bold',
    fontWeight: '600',
    color: COLORS.WHITE,
    letterSpacing: -1.2,
    marginRight: 'auto',
  },
  headerPressableText: {
    fontSize: 13,
    lineHeight: 13,
    fontFamily: 'SF-Bold',
    fontWeight: '800',
    color: COLORS.LIGHT_GREY,
  },
  scrollView: {
    paddingVertical: 4,
  },
  scrollViewContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  album: {
    padding: 8,
  },
});
