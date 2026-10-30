import { Fragment, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import type { Track } from '@/types';
import { removeFromQueue, reorderQueue, skipTo, stop } from '@/services/audio/controller';
import { usePlayerStore } from '@/services/audio/store';
import { t } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Cover } from '../Cover';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { BottomSheet } from '../Overlays';
import { ConfirmDialog } from './ConfirmDialog';
import { SheetDivider } from './SheetDivider';
import { SheetHeader } from './SheetHeader';
import { SheetRow } from './SheetRow';
import { showToast } from './ToastHost';

export function QueueSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queue = usePlayerStore((state) => state.queue);
  const currentTrack = queue.items[queue.index] ?? null;
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const move = async (from: number, to: number) => {
    try {
      await reorderQueue(from, to);
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('common.error'), { icon: 'warning-outline' });
    }
  };

  const clear = async () => {
    setClearing(true);
    try {
      await stop();
      setConfirmClear(false);
      onClose();
      showToast(t('player.queueCleared'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('common.error'), { icon: 'warning-outline' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} contentStyle={s.sheet}>
        <View style={s.content}>
          <SheetHeader title={currentTrack?.title ?? t('player.nextUp')} subtitle={currentTrack?.artist} artworkUrl={currentTrack?.artworkUrl} />
          {queue.items.length > 0 ? (
            <>
              <SheetRow icon="trash-outline" label={t('player.clearQueue')} destructive onPress={() => setConfirmClear(true)} />
              <SheetDivider />
            </>
          ) : null}
          <ScrollView style={s.list}>
            {queue.items.length === 0 ? (
              <Text style={s.empty}>{t('player.queueEmpty')}</Text>
            ) : queue.items.map((track, index) => (
              <Fragment key={`${track.id}-${index}`}>
                {index === queue.recStart ? (
                  <View style={s.suggestionsHeader}>
                    <SheetDivider style={s.suggestionLine} />
                    <Text style={s.suggestionsTitle}>{t('player.recommended')}</Text>
                    <SheetDivider style={s.suggestionLine} />
                  </View>
                ) : null}
                <QueueItem
                  track={track}
                  index={index}
                  count={queue.items.length}
                  current={index === queue.index}
                  onMove={move}
                  onSelect={() => void skipTo(index)}
                  onRemove={() => void removeFromQueue(index).catch((error: unknown) => {
                    showToast(error instanceof Error ? error.message : t('common.error'), { icon: 'warning-outline' });
                  })}
                />
              </Fragment>
            ))}
          </ScrollView>
        </View>
      </BottomSheet>
      <ConfirmDialog
        visible={confirmClear}
        title={t('player.clearQueueConfirmTitle')}
        message={t('player.clearQueueConfirmMessage')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.confirm')}
        busy={clearing}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => void clear()}
      />
    </>
  );
}

function QueueItem({ track, index, count, current, onMove, onSelect, onRemove }: {
  track: Track;
  index: number;
  count: number;
  current: boolean;
  onMove: (from: number, to: number) => void;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 8,
    onPanResponderGrant: () => setDragging(true),
    onPanResponderRelease: (_event, gesture) => {
      setDragging(false);
      const offset = Math.round(gesture.dy / 56);
      const destination = Math.max(0, Math.min(count - 1, index + offset));
      if (destination !== index) {
        if (Platform.OS !== 'web') Vibration.vibrate(10);
        onMove(index, destination);
      }
    },
    onPanResponderTerminate: () => setDragging(false),
  })).current;

  return (
    <View style={[s.row, current && s.current, dragging && s.dragging]}>
      <Pressable accessibilityRole="button" accessibilityLabel={track.title} onPress={onSelect} style={s.main}>
        <Cover uri={track.artworkUrl} size={48} radius={8} />
        <View style={s.trackCopy}>
          <Text numberOfLines={1} style={[s.trackTitle, current && s.currentText]}>{track.title}</Text>
          <Text numberOfLines={1} style={s.artist}>{track.artist}</Text>
        </View>
      </Pressable>
      <IconButton icon="close" label={t('player.remove')} onPress={onRemove} size={20} color={colors.textMuted} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('player.reorderTrack')} style={s.dragHandle} {...pan.panHandlers}>
        <Icon name="reorder-two-outline" size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { gap: 0 },
  content: { gap: spacing.sm },
  list: { maxHeight: 520, flexShrink: 1 },
  empty: { padding: spacing.md, color: colors.textMuted, fontSize: font.md },
  suggestionsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  suggestionLine: { flex: 1 },
  suggestionsTitle: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  main: { flex: 1, minWidth: 0, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  current: { backgroundColor: 'rgba(198,226,122,0.12)' },
  dragging: { opacity: 0.65 },
  trackCopy: { flex: 1, minWidth: 0, gap: 2 },
  trackTitle: { color: colors.text, fontSize: font.md },
  currentText: { color: '#C6E27A', fontWeight: '600' },
  artist: { color: '#A8A8A8', fontSize: 13 },
  dragHandle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
