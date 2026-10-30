import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Dialog } from './Overlays';

/** Janela simples para pedir um texto (criar/renomear playlist). */
export function TextPromptModal({ visible, title, initialValue = '', placeholder, confirmLabel, error, onSubmit, onClose }: {
  visible: boolean; title: string; initialValue?: string; placeholder?: string; confirmLabel: string;
  error?: string | null; onSubmit: (value: string) => void; onClose: () => void;
}) {
  useTranslation();
  const [value, setValue] = useState(initialValue);
  useEffect(() => { if (visible) setValue(initialValue); }, [visible, initialValue]);

  return (
    <Dialog visible={visible} onClose={onClose} title={title}>
      <View style={s.content}>
          <TextInput
            autoFocus value={value} onChangeText={setValue} onSubmitEditing={() => onSubmit(value)}
            placeholder={placeholder} placeholderTextColor={colors.textFaint} returnKeyType="done" selectionColor={colors.accent} style={s.input}
          />
          {error ? <Text style={s.err}>{error}</Text> : null}
          <View style={s.actions}>
            <Button label={t('common.cancel')} variant="secondary" onPress={onClose} style={s.actionButton} />
            <Button label={confirmLabel} onPress={() => onSubmit(value)} style={s.actionButton} />
          </View>
      </View>
    </Dialog>
  );
}

const s = StyleSheet.create({
  content: { width: '100%', alignSelf: 'stretch', gap: spacing.lg, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  input: { width: '100%', minWidth: 0, minHeight: 48, alignSelf: 'stretch', backgroundColor: '#242424', color: colors.text, fontSize: font.md, paddingHorizontal: spacing.md, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  err: { color: colors.danger, fontSize: font.md },
  actions: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  actionButton: { flex: 1, minHeight: 48, borderRadius: 8 },
});
