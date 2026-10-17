import { COLORS, Shapes } from '@config';
import { hexToRGB } from '@utils';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.PRIMARY,
    paddingBottom: 16,
    elevation: 20,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 20,
    zIndex: 99,
  },
  content: {
    paddingHorizontal: 16,
    marginTop: 35,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profile: {
    width: 35,
    height: 35,
    overflow: 'hidden',
    borderRadius: Shapes.CIRCLE,
    backgroundColor: hexToRGB(COLORS.PRIMARY, 0.3),
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  titleText: {
    color: COLORS.WHITE,
    textAlign: 'center',
    fontFamily: 'SF-Bold',
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 22,
    marginLeft: 8,
    marginRight: 'auto',
  },
  icon: {
    fontSize: 30,
    color: COLORS.WHITE,
    marginLeft: 16,
  },
});
