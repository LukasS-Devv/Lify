import { StyleSheet } from 'react-native';
import { COLORS, Shapes } from '@config';

export const styles = StyleSheet.create({
  category: {
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Shapes.CIRCLE,
  },
  categoryText: {
    color: COLORS.WHITE,
  },
});
