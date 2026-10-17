import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, font, radius, spacing } from '@/theme/tokens';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress} style={[s.chip, selected && s.on]}>
      <Text style={[s.text, selected && { color: colors.accentText }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  on: { backgroundColor: colors.accent },
  text: { color: colors.text, fontSize: font.md, fontWeight: '600' },
});
