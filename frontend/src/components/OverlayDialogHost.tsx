import { useCallback, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '@/i18n';
import { colors, font, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Dialog } from './Overlays';

interface DialogRequest {
  title: string;
  message: string;
  choices: { label: string; value: string; destructive?: boolean }[];
  resolve: (value: string) => void;
}

let currentDialog: DialogRequest | null = null;
const queuedDialogs: DialogRequest[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function requestDialog(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return requestChoiceDialog({
    title: options.title,
    message: options.message,
    choices: [
      { label: t('common.cancel'), value: 'cancel' },
      {
        label: options.confirmLabel ?? t('common.confirm'),
        value: 'confirm',
        destructive: options.destructive,
      },
    ],
  }).then((value) => value === 'confirm');
}

export function requestChoiceDialog(options: {
  title: string;
  message: string;
  choices: { label: string; value: string; destructive?: boolean }[];
}): Promise<string> {
  return new Promise((resolve) => {
    const request = {
      ...options,
      resolve,
    };
    if (currentDialog) queuedDialogs.push(request);
    else currentDialog = request;
    emit();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DialogRequest | null {
  return currentDialog;
}

export function OverlayDialogHost() {
  const dialog = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const close = useCallback((value: string) => {
    const active = currentDialog;
    if (!active) return;
    active.resolve(value);
    currentDialog = queuedDialogs.shift() ?? null;
    emit();
  }, []);

  return (
    <Dialog
      visible={dialog !== null}
      onClose={() => close(dialog?.choices[0]?.value ?? 'cancel')}
      title={dialog?.title}
      closeOnBackdrop={!dialog?.choices.some((choice) => choice.destructive)}
    >
      {dialog ? (
        <>
          <Text style={s.message}>{dialog.message}</Text>
          <View style={s.actions}>
            {dialog.choices.map((choice) => (
              <Button
                key={choice.value}
                label={choice.label}
                variant={choice.destructive ? 'danger' : choice.value === 'cancel' ? 'secondary' : 'primary'}
                onPress={() => close(choice.value)}
                style={s.choiceButton}
              />
            ))}
          </View>
        </>
      ) : null}
    </Dialog>
  );
}

const s = StyleSheet.create({
  message: { color: colors.textMuted, fontSize: font.md, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  choiceButton: { flex: 1, minHeight: 48, borderRadius: 8 },
});
