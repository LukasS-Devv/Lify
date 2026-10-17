import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStartupStore } from '@/services/startup';
import { t, useTranslation } from '@/i18n';
import { colors } from '@/theme/tokens';

export function ServerNotice() {
  useTranslation();
  const router = useRouter();
  const configured = useStartupStore((state) => state.streamServerConfigured);
  const dismissed = useStartupStore((state) => state.serverNoticeDismissed);
  const dismiss = useStartupStore((state) => state.dismissServerNotice);

  if (configured || dismissed) return null;

  return (
    <View style={s.container}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={s.content}>
        <Text style={s.message}>{t('app.serverNotConfigured')}</Text>
        <Text style={s.action}>{t('app.configureServer')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('app.dismissServerNotice')}
        hitSlop={8}
        onPress={dismiss}
        style={s.close}
      >
        <Text style={s.closeText}>×</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  message: { color: colors.text, flex: 1, fontSize: 13 },
  action: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  close: { paddingHorizontal: 4 },
  closeText: { color: colors.textMuted, fontSize: 22, lineHeight: 24 },
});
