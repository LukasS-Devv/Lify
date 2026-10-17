import { StyleSheet, Text, View } from 'react-native';
import { t, useTranslation } from '@/i18n';
import { colors, font, spacing } from '@/theme/tokens';
import { Button } from './Button';

/** Barra "N faixas · Aleatório · Tocar" no topo de listas de faixas. */
export function PlayAllBar({ count, onPlay, onShuffle }: { count: number; onPlay: () => void; onShuffle: () => void }) {
  useTranslation();
  if (count === 0) return null;
  return (
    <View style={s.row}>
      <Text style={s.count}>{t('common.tracks', { count })}</Text>
      <View style={s.actions}>
        <Button variant="secondary" icon="shuffle" label={t('common.shuffle')} onPress={onShuffle} />
        <Button icon="play" label={t('common.play')} onPress={onPlay} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  count: { color: colors.textMuted, fontSize: font.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
