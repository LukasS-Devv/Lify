import { create } from 'zustand';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, layout, radius, shadow, spacing } from '@/theme/tokens';
import { Icon, type IconName } from '../Icon';

export interface ToastOptions {
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  lifted?: boolean;
}

interface ToastMessage extends ToastOptions {
  id: number;
  message: string;
}

interface ToastState {
  message: ToastMessage | null;
  setMessage: (message: ToastMessage | null) => void;
}

const useToastStore = create<ToastState>((set) => ({
  message: null,
  setMessage: (message) => set({ message }),
}));
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let toastId = 0;

export function showToast(message: string, options: ToastOptions = {}): void {
  if (hideTimer) clearTimeout(hideTimer);
  useToastStore.getState().setMessage({ ...options, id: ++toastId, message });
  hideTimer = setTimeout(() => {
    hideTimer = null;
    useToastStore.getState().setMessage(null);
  }, 2500);
}

export function useToast() {
  return { showToast };
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const message = useToastStore((state) => state.message);
  if (!message) return null;

  const dismiss = () => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    useToastStore.getState().setMessage(null);
  };
  const bottom = insets.bottom + layout.tabBarHeight + spacing.md
    + (message.lifted ? layout.miniPlayerHeight + spacing.sm : 0);

  return (
    <View pointerEvents="box-none" style={[s.host, { bottom }]}>
      <View accessibilityRole="alert" style={[s.toast, shadow.card]}>
        <Icon name={message.icon ?? 'checkmark-circle'} size={20} color="#C6E27A" />
        <Text numberOfLines={2} style={s.text}>{message.message}</Text>
        {message.actionLabel && message.onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={message.actionLabel}
            onPress={() => { message.onAction?.(); dismiss(); }}
            style={s.action}
          >
            <Text style={s.actionText}>{message.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  host: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 100 },
  toast: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: '#242424', borderRadius: radius.md },
  text: { flex: 1, color: colors.text, fontSize: font.md },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  actionText: { color: '#C6E27A', fontSize: font.md, fontWeight: '600' },
});
