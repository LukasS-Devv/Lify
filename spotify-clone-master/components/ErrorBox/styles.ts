import { COLORS, Shapes } from '@config';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    backgroundColor: COLORS.SECONDARY,
    borderRadius: Shapes.EDGED_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLORS.GREY,
    fontSize: 16,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: 'SF-Regular',
  },
});
