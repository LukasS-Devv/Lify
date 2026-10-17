import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '@/theme/tokens';
import { Card, type CardItem } from './Card';

export function Slider({ title, items, onShowAll, showAllLabel, size, shape }: {
  title: string;
  items: CardItem[];
  onShowAll?: () => void;
  showAllLabel?: string;
  size?: number;
  shape?: 'square' | 'circle';
}) {
  if (items.length === 0) return null;

  return (
    <View style={s.container}>
      <View style={s.heading}>
        <Text numberOfLines={1} style={s.title}>{title}</Text>
        {onShowAll ? (
          <Pressable accessibilityRole="button" onPress={onShowAll} hitSlop={8}>
            <Text style={s.showAll}>{showAllLabel ?? 'Ver tudo'}</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.items}>
        {items.map((item) => <Card key={item.id} item={item} size={size} shape={shape} />)}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, gap: spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  showAll: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  items: { gap: spacing.md, paddingHorizontal: spacing.md },
});
