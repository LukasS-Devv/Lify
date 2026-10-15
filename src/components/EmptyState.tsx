import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '@/theme/tokens';

export function EmptyState({ message, loading }: { message: string; loading?: boolean }) {
  return (
    <View style={s.box}>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      <Text style={s.text}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  text: { color: colors.textMuted, fontSize: font.md, textAlign: 'center' },
});
