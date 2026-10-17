import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PlaylistSummary, Track } from '@/types';
import { favoritesRepo, getDb, playlistsRepo } from '@/database';
import { addToQueueEnd, addToQueueNext } from '@/services/audio/controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Cover } from './Cover';
import { Icon, type IconName } from './Icon';

/** Menu de ações de uma faixa: curtir, fila, adicionar a playlist. */
export function TrackActionsModal({ track, onClose, onRemoveFromPlaylist, onSleepTimer, showIcons = true }: {
  track: Track | null; onClose: () => void; onRemoveFromPlaylist?: (t: Track) => void; onSleepTimer?: () => void; showIcons?: boolean;
}) {
  useTranslation();
  const insets = useSafeAreaInsets();
  const [fav, setFav] = useState(false);
  const [lists, setLists] = useState<PlaylistSummary[]>([]);
  const [showLists, setShowLists] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!track) return;
    setShowLists(false); setMsg(null);
    (async () => {
      const db = await getDb();
      setFav(await favoritesRepo.isFavorite(db, track.id));
      setLists(await playlistsRepo.listPlaylists(db));
    })().catch(() => {});
  }, [track]);

  if (!track) return null;

  const run = async (fn: () => Promise<string | void> | string | void) => {
    try {
      const m = await fn();
      if (m) setMsg(m);
      else onClose();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t('common.error'));
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}>
        <View style={s.head}>
          <Cover uri={track.artworkUrl} size={48} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={s.title}>{track.title}</Text>
            <Text numberOfLines={1} style={s.sub}>{track.artist}</Text>
          </View>
        </View>
        {msg ? <Text style={s.msg}>{msg}</Text> : null}

        {showLists ? (
          <ScrollView style={{ maxHeight: 280 }}>
            {lists.length === 0 ? <Text style={s.sub}>{t('actions.noPlaylists')}</Text> : null}
            {lists.map((p) => (
              <Item key={p.id} icon="list" showIcon={showIcons} label={p.name} onPress={() => run(async () => {
                const added = await playlistsRepo.addTrackToPlaylist(await getDb(), p.id, track);
                return added ? t('actions.addedTo', { name: p.name }) : t('actions.alreadyIn', { name: p.name });
              })} />
            ))}
          </ScrollView>
        ) : (
          <>
            <Item icon={fav ? 'heart' : 'heart-outline'} showIcon={showIcons} label={fav ? t('actions.unlike') : t('actions.like')} onPress={() => run(async () => {
              const now = await favoritesRepo.toggleFavorite(await getDb(), track);
              setFav(now);
              return now ? t('actions.liked') : t('actions.unliked');
            })} />
            <Item icon="add-circle-outline" showIcon={showIcons} label={t('actions.addToPlaylist')} onPress={() => setShowLists(true)} />
            <Item icon="play-forward-outline" showIcon={showIcons} label={t('actions.playNext')} onPress={() => run(() => { addToQueueNext(track); return t('actions.queued'); })} />
            <Item icon="list-outline" showIcon={showIcons} label={t('actions.addToQueue')} onPress={() => run(() => { addToQueueEnd([track]); return t('actions.queued'); })} />
            {onSleepTimer ? <Item icon="timer-outline" showIcon={showIcons} label={t('player.sleepTimer.open')} onPress={onSleepTimer} /> : null}
            {onRemoveFromPlaylist ? (
              <Item icon="trash-outline" showIcon={showIcons} label={t('actions.removeFromPlaylist')} danger onPress={() => { onRemoveFromPlaylist(track); onClose(); }} />
            ) : null}
          </>
        )}
        <Item icon="close" showIcon={showIcons} label={t('common.close')} muted onPress={onClose} />
      </View>
    </Modal>
  );
}

function Item({ icon, label, onPress, danger, muted, showIcon = true }: { icon: IconName; label: string; onPress: () => void; danger?: boolean; muted?: boolean; showIcon?: boolean }) {
  const color = danger ? colors.danger : muted ? colors.textMuted : colors.text;
  return (
    <Pressable onPress={onPress} style={s.item}>
      {showIcon ? <Icon name={icon} size={22} color={color} /> : null}
      <Text style={[s.itemText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surfaceAlt, padding: spacing.md, paddingBottom: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: font.md },
  msg: { color: colors.accent, marginBottom: spacing.sm, fontSize: font.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14 },
  itemText: { fontSize: font.lg },
});
