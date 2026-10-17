import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function EmptyState({ message, title, loading, icon, actionLabel, onAction }: {
  message: string; title?: string; loading?: boolean; icon?: IconName; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={s.box}>
      {loading ? <ActivityIndicator color={colors.accent} /> : icon ? <Icon name={icon} size={40} color={colors.textFaint} /> : null}
      {title ? <Text style={s.title}>{title}</Text> : null}
      <Text style={s.text}>{message}</Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: font.xl, fontWeight: '800', textAlign: 'center' },
  text: { color: colors.textMuted, fontSize: font.md, textAlign: 'center', marginBottom: spacing.sm },
});
