import { StyleSheet, Text, View } from 'react-native';
import { t } from '@/i18n';
import { colors, font, spacing } from '@/theme/tokens';
import { Cover } from '../Cover';
import { IconButton } from '../IconButton';

export function SheetHeader({
  title,
  subtitle,
  artworkUrl,
  onBack,
  onClose,
}: {
  title: string;
  subtitle?: string;
  artworkUrl?: string | null;
  onBack?: () => void;
  onClose?: () => void;
}) {
  return (
    <View style={s.header}>
      {onBack ? <IconButton icon="arrow-back" label={t('common.back')} onPress={onBack} size={20} color={colors.textMuted} /> : null}
      {artworkUrl !== undefined ? <Cover uri={artworkUrl} size={48} /> : null}
      <View style={s.copy}>
        <Text numberOfLines={1} accessibilityRole="header" style={s.title}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {onClose ? <IconButton icon="close" label={t('common.close')} onPress={onClose} size={20} color={colors.textMuted} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '600' },
  subtitle: { color: '#A8A8A8', fontSize: 13 },
});
