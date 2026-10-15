import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PlaylistSummary, Track } from '@/types';
import { favoritesRepo, getDb, playlistsRepo } from '@/database';
import { addToQueueEnd, addToQueueNext } from '@/services/audio/controller';
import { colors, font, radius, spacing } from '@/theme/tokens';

/** Menu de ações de uma faixa: favoritar, fila, adicionar a playlist. */
export function TrackActionsModal({ track, onClose, onRemoveFromPlaylist }: {
  track: Track | null; onClose: () => void; onRemoveFromPlaylist?: (t: Track) => void;
}) {
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
      setMsg(e instanceof Error ? e.message : 'Algo deu errado.');
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <Text numberOfLines={1} style={s.title}>{track.title}</Text>
        <Text numberOfLines={1} style={s.sub}>{track.artist}</Text>
        {msg ? <Text style={s.msg}>{msg}</Text> : null}

        {showLists ? (
          <ScrollView style={{ maxHeight: 280 }}>
            {lists.length === 0 ? <Text style={s.sub}>Nenhuma playlist criada ainda.</Text> : null}
            {lists.map((p) => (
              <Item key={p.id} label={p.name} onPress={() => run(async () => {
                const added = await playlistsRepo.addTrackToPlaylist(await getDb(), p.id, track);
                return added ? `Adicionada a "${p.name}"` : `Já está em "${p.name}"`;
              })} />
            ))}
          </ScrollView>
        ) : (
          <>
            <Item label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} onPress={() => run(async () => {
              const now = await favoritesRepo.toggleFavorite(await getDb(), track);
              setFav(now);
              return now ? 'Adicionada aos favoritos' : 'Removida dos favoritos';
            })} />
            <Item label="Adicionar a uma playlist" onPress={() => setShowLists(true)} />
            <Item label="Tocar a seguir" onPress={() => run(() => { addToQueueNext(track); return 'Adicionada à fila'; })} />
            <Item label="Adicionar ao fim da fila" onPress={() => run(() => { addToQueueEnd([track]); return 'Adicionada à fila'; })} />
            {onRemoveFromPlaylist ? (
              <Item label="Remover desta playlist" danger onPress={() => { onRemoveFromPlaylist(track); onClose(); }} />
            ) : null}
          </>
        )}
        <Item label="Fechar" onPress={onClose} />
      </View>
    </Modal>
  );
}

function Item({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={s.item}>
      <Text style={[s.itemText, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.surfaceAlt, padding: spacing.md, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: font.md, marginBottom: spacing.sm },
  msg: { color: colors.accent, marginBottom: spacing.sm },
  item: { paddingVertical: 14 },
  itemText: { color: colors.text, fontSize: font.lg },
});
