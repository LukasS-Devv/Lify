import { StyleSheet } from 'react-native';
import { COLORS } from '@config';

export const styles = StyleSheet.create({
  view: {
    paddingTop: 20,
    paddingHorizontal: 16,
    flexDirection: 'column',
    backgroundColor: COLORS.PRIMARY,
  },
  text: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 13,
    fontFamily: 'SF-Regular',
    color: COLORS.WHITE,
    minHeight: 13,
  },
});
