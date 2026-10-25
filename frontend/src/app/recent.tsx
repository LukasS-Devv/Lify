import { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState, IconButton, Screen, TrackRow } from '@/components';
import { useHistory } from '@/features/library/useLibrary';
import { t, useTranslation } from '@/i18n';
import { playQueue } from '@/services/audio/controller';
import { layout } from '@/theme/tokens';
import { uniqueRecentTracks } from '@/utils/recent';

export default function RecentTracksScreen() {
  useTranslation();
  const router = useRouter();
  const { data, loading } = useHistory(500);
  const tracks = uniqueRecentTracks(data);

  return (
    <Screen
      title={t('home.recent')}
      right={<IconButton icon="close" label={t('common.close')} onPress={() => router.back()} />}
    >
      <FlatList
        data={tracks}
        keyExtractor={(track, index) => `${track.id}-${index}`}
        contentContainerStyle={{ paddingBottom: layout.listBottomPad }}
        renderItem={({ item, index }) => (
          <TrackRow track={item} onPress={() => playQueue(tracks, index)} />
        )}
        ListEmptyComponent={
          <EmptyState
            loading={loading}
            message={loading ? t('common.loading') : t('library.emptyHistory')}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}
