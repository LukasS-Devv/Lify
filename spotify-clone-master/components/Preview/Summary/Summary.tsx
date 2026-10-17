import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Entypo } from '@expo/vector-icons';

import { AnimatedPressable } from './AnimatedPressable';

import { checkSavedAlbums, checkSavedPlaylists } from '@api';

import { styles } from './styles';

export type SummaryPropsType = {
  id: string;
  type: 'album' | 'playlist';
  title: string;
  subtitle: string;
  info: string;
  forceDisableSaveIcon?: boolean;
};

export const Summary = ({
  id,
  type,
  title,
  subtitle,
  info,
  forceDisableSaveIcon,
}: SummaryPropsType) => {
  const [isSaved, setIsSaved] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!id) {
      return;
    }

    (async () => {
      try {
        const savedAlbums =
          type === 'album'
            ? await checkSavedAlbums([id])
            : await checkSavedPlaylists([id]);

        setIsSaved(savedAlbums[0]);
      } catch (error) {
        setIsSaved(false);
        console.error(`Failed to check if ${type} is saved:`, error);
      }
    })();
  }, [type, id]);

  return (
    <View style={styles.summary}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.info}>{info}</Text>

      <View style={styles.pressablesView}>
        {!forceDisableSaveIcon && (
          <AnimatedPressable
            defaultIcon="plus"
            activeIcon="check"
            isActive={isSaved}
          />
        )}
        <AnimatedPressable
          defaultIcon="arrow-down"
          activeIcon="arrow-down"
          // TODO: removed this true value and check if tracks are downloaded instead
          isActive={true}
        />
        <Pressable>
          <Entypo style={styles.moreIcon} name="dots-three-horizontal" />
        </Pressable>
      </View>
    </View>
  );
};
