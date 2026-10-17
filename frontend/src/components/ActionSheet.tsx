import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';

export interface SheetItem { icon: IconName; label: string; onPress: () => void; danger?: boolean }

/** Folha inferior com lista de ações. */
export function ActionSheet({ visible, title, items, onClose }: {
  visible: boolean; title?: string; items: SheetItem[]; onClose: () => void;
}) {
  useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}>
        {title ? <Text numberOfLines={1} style={s.title}>{title}</Text> : null}
        {items.map((it) => (
          <Pressable key={it.label} onPress={() => { onClose(); it.onPress(); }} style={s.item}>
            <Icon name={it.icon} size={22} color={it.danger ? colors.danger : colors.text} />
            <Text style={[s.itemText, it.danger && { color: colors.danger }]}>{it.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onClose} style={s.item}>
          <Icon name="close" size={22} color={colors.textMuted} />
          <Text style={[s.itemText, { color: colors.textMuted }]}>{t('common.close')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surfaceAlt, padding: spacing.md, paddingBottom: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  title: { color: colors.text, fontSize: font.lg, fontWeight: '700', paddingVertical: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14 },
  itemText: { color: colors.text, fontSize: font.lg },
});
