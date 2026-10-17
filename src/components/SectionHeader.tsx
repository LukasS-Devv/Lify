import { StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '@/theme/tokens';

export function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.row}>
      <Text accessibilityRole="header" style={s.title}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
});
