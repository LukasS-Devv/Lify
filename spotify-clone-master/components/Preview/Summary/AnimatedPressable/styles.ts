import { Shapes } from '@config';
import { hexToRGB } from '@utils';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 26,
    height: 26,
    borderRadius: Shapes.CIRCLE,
    borderWidth: 3,
    shadowColor: hexToRGB('#61ef61', 0.6),
    shadowOffset: { width: 0, height: 0 },
  },
  view: {
    ...StyleSheet.absoluteFillObject,
    width: 21,
    height: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
