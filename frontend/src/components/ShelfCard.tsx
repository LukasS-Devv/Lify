import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, layout } from '@/theme/tokens';
import { PressableScale } from './PressableScale';

/** Cartão de prateleira horizontal: capa grande + título + subtítulo. */
export function ShelfCard({ cover, title, subtitle, onPress, active }: {
  cover: ReactNode; title: string; subtitle?: string; onPress: () => void; active?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={s.card}>
      <View>{cover}</View>
      <Text numberOfLines={1} style={[s.title, active && { color: colors.accent }]}>{title}</Text>
      {subtitle ? <Text numberOfLines={1} style={s.sub}>{subtitle}</Text> : null}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  card: { width: layout.shelfCard, gap: 2 },
  title: { color: colors.text, fontSize: font.md, fontWeight: '700', marginTop: 8 },
  sub: { color: colors.textMuted, fontSize: font.sm },
});
