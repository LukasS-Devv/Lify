import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontAwesome5 } from '@expo/vector-icons';

import { useApplicationDimensions } from '@hooks';
import { explicit_SIGN, TRACK_COVER_SIZE } from '@config';
import { getFallbackImage } from '@utils';

import { styles } from './styles';

export type TrackPropsType = {
  type: 'album' | 'playlist';
  title: string;
  subtitle: string;
  imageURL?: string;
  isDownloaded: boolean;
  isSaved: boolean;
  isPlaying: boolean;
  explicit: boolean;
  forceDisableSaveIcon?: boolean;
};

export const Track = ({
  type,
  title,
  subtitle,
  imageURL,
  isDownloaded,
  isSaved,
  isPlaying,
  explicit,
  forceDisableSaveIcon,
}: TrackPropsType) => {
  const { width } = useApplicationDimensions();
  const maxWidth = width - 150;
  const isPlaylist = type === 'playlist';

  return (
    <View style={styles.container}>
      {isPlaylist && (
        <Image
          style={styles.image}
          source={imageURL ? { uri: imageURL } : getFallbackImage('track')}
        />
      )}
      <View style={styles.content}>
        <View
          style={[
            styles.nameView,
            {
              maxWidth:
                isPlaylist && !forceDisableSaveIcon
                  ? 280 - TRACK_COVER_SIZE
                  : 280,
            },
          ]}
        >
          {isPlaying && (
            <Ionicons style={styles.isPlayingIcon} name="stats-chart-sharp" />
          )}
          <Text
            numberOfLines={1}
            style={[
              styles.nameText,
              { maxWidth },
              isPlaying ? styles.nameTextActive : {},
            ]}
          >
            {title}
          </Text>
        </View>

        <View style={styles.artistNameView}>
          {isDownloaded && (
            <View style={styles.isTrackDownloadedView}>
              <MaterialCommunityIcons
                style={styles.isTrackDownloadedIcon}
                name="arrow-down-bold"
              />
            </View>
          )}
          {explicit && (
            <View style={styles.explicitView}>
              <Text style={styles.explicitText}>{explicit_SIGN}</Text>
            </View>
          )}
          <Text numberOfLines={1} style={[styles.artistNameText, { maxWidth }]}>
            {subtitle}
          </Text>
        </View>
      </View>

      {isSaved && !forceDisableSaveIcon && (
        <Pressable style={styles.isTrackSavedPressable}>
          <FontAwesome5 name="check" style={styles.isTrackSavedIcon} />
        </Pressable>
      )}
      <Pressable>
        <Entypo style={styles.moreIcon} name="dots-three-horizontal" />
      </Pressable>
    </View>
  );
};
