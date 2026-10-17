import { COLORS, Shapes, TRACK_COVER_SIZE } from '@config';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    height: 58,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: TRACK_COVER_SIZE,
    height: TRACK_COVER_SIZE,
    marginRight: 10,
  },
  content: {
    marginRight: 'auto',
  },
  nameView: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  isPlayingIcon: {
    marginRight: 6,
    fontSize: 13,
    color: COLORS.TINT,
  },
  nameText: {
    color: COLORS.WHITE,
    textAlign: 'center',
    fontFamily: 'SF-Regular',
    fontSize: 17,
    lineHeight: 17,
    minHeight: 17,
  },
  nameTextActive: {
    color: COLORS.TINT,
  },

  artistNameView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  isTrackDownloadedView: {
    width: 13,
    height: 13,
    borderRadius: Shapes.CIRCLE,
    backgroundColor: COLORS.TINT,
    position: 'relative',
    marginRight: 4,
  },
  explicitView: {
    borderRadius: Shapes.SQUARE_BORDER_SMALL,
    backgroundColor: COLORS.LIGHT_GREY,
    padding: 1.5,
    marginRight: 4,
  },
  explicitText: {
    color: COLORS.PRIMARY,
    textAlign: 'center',
    fontFamily: 'SF-Bold',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 10,
    width: 10,
    height: 10,
  },
  isTrackDownloadedIcon: {
    ...StyleSheet.absoluteFillObject,
    top: 0.5,
    left: 0.5,
    color: COLORS.PRIMARY,
    fontSize: 12,
  },
  isTrackSavedPressable: {
    borderRadius: Shapes.CIRCLE,
    backgroundColor: COLORS.TINT,
    position: 'relative',
    marginRight: 25,
    padding: 4,
  },
  isTrackSavedIcon: {
    color: COLORS.PRIMARY,
    fontSize: 9,
  },
  artistNameText: {
    color: COLORS.LIGHT_GREY,
    textAlign: 'center',
    fontFamily: 'SF-Regular',
    fontSize: 14,
    lineHeight: 14,
    minHeight: 14,
  },

  likePressable: {
    marginHorizontal: 15,
  },
  likeIcon: {
    fontSize: 20,
    color: COLORS.LIGHTER_GREY,
  },
  likeIconActive: {
    color: COLORS.TINT,
  },

  moreIcon: {
    fontSize: 20,
    color: COLORS.LIGHTER_GREY,
  },
});
