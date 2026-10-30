import { StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '@/theme/tokens';
import { Button } from '../Button';
import { Dialog } from '../Overlays';

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog visible={visible} onClose={onCancel} title={title} closeOnBackdrop={!busy} busy={busy}>
      <Text style={s.message}>{message}</Text>
      <View style={s.actions}>
        <Button label={cancelLabel} variant="secondary" onPress={onCancel} disabled={busy} style={s.actionButton} />
        <Button label={confirmLabel} variant="danger" onPress={onConfirm} loading={busy} style={s.actionButton} />
      </View>
    </Dialog>
  );
}

const s = StyleSheet.create({
  message: { color: colors.textMuted, fontSize: font.md, lineHeight: 20 },
  actions: { width: '100%', flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  actionButton: { flex: 1, minHeight: 48, borderRadius: 8 },
});
