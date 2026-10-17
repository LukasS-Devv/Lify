import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Button } from './Button';

/** Janela simples para pedir um texto (criar/renomear playlist). */
export function TextPromptModal({ visible, title, initialValue = '', placeholder, confirmLabel, error, onSubmit, onClose }: {
  visible: boolean; title: string; initialValue?: string; placeholder?: string; confirmLabel: string;
  error?: string | null; onSubmit: (value: string) => void; onClose: () => void;
}) {
  useTranslation();
  const [value, setValue] = useState(initialValue);
  useEffect(() => { if (visible) setValue(initialValue); }, [visible, initialValue]);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.sheet}>
          <Text style={s.title}>{title}</Text>
          <TextInput
            autoFocus value={value} onChangeText={setValue} onSubmitEditing={() => onSubmit(value)}
            placeholder={placeholder} placeholderTextColor={colors.textFaint} returnKeyType="done" style={s.input}
          />
          {error ? <Text style={s.err}>{error}</Text> : null}
          <View style={s.actions}>
            <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
            <Button label={confirmLabel} onPress={() => onSubmit(value)} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },
  sheet: { marginTop: 'auto', backgroundColor: colors.surfaceAlt, padding: spacing.lg, gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  title: { color: colors.text, fontSize: font.xl, fontWeight: '800' },
  input: { backgroundColor: colors.elevated, color: colors.text, fontSize: font.lg, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.md },
  err: { color: colors.danger, fontSize: font.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
