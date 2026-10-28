import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { ContextMenu } from './Overlays';

export interface SheetItem { icon: IconName; label: string; onPress: () => void; danger?: boolean }

/** Folha inferior com lista de ações. */
export function ActionSheet({ visible, title, items, onClose, position }: {
  visible: boolean; title?: string; items: SheetItem[]; onClose: () => void; position?: { x: number; y: number };
}) {
  useTranslation();
  return (
    <ContextMenu visible={visible} onClose={onClose} title={title} position={position}>
        {items.map((it) => (
          <View key={it.label}>
            {it.danger ? <View style={s.divider} /> : null}
            <Pressable accessibilityRole="menuitem" onPress={() => { onClose(); it.onPress(); }} style={s.item}>
            <Icon name={it.icon} size={18} color={it.danger ? colors.danger : colors.textMuted} />
            <Text style={[s.itemText, it.danger && { color: colors.danger }]}>{it.label}</Text>
            </Pressable>
          </View>
        ))}
    </ContextMenu>
  );
}

const s = StyleSheet.create({
  item: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  itemText: { color: colors.text, fontSize: font.md },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs },
});
