import { COLORS } from '@config';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: COLORS.PRIMARY,
  },
  text: {
    fontSize: 13,
    lineHeight: 13,
    fontFamily: 'SF-Bold',
    fontWeight: '500',
    color: COLORS.WHITE,
  },
});
