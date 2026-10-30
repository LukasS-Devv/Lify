import { Platform, Pressable, StyleSheet, Text, Vibration, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, useTranslation } from '@/i18n';
import { colors, font, layout, radius, spacing } from '@/theme/tokens';
import { BottomSheet } from './Overlays';
import { SheetHeader, showToast } from './overlay';

const PRESETS = [5, 15, 30, 45, 60, 120];

export function SleepTimerModal({ visible, selectedPreset, remainingTime, onSelect, onSelectTrackEnd, onCancel, onClose }: {
  visible: boolean;
  selectedPreset: number | 'trackEnd' | null;
  remainingTime: string | null;
  onSelect: (minutes: number) => void;
  onSelectTrackEnd: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= layout.desktopBreakpoint;
  const presetRows = desktop
    ? [PRESETS.slice(0, 3), PRESETS.slice(3)]
    : [PRESETS.slice(0, 2), PRESETS.slice(2, 4), PRESETS.slice(4)];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      contentStyle={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
    >
      <View style={s.content}>
        <SheetHeader title={t('player.sleepTimer.title')} subtitle={t('player.sleepTimer.subtitle')} onClose={onClose} />

        {selectedPreset !== null ? (
          <View style={s.active}>
            <Text style={s.activeText}>
              {selectedPreset === 'trackEnd'
                ? t('player.sleepTimer.activeTrackEnd')
                : t('player.sleepTimer.active', { time: remainingTime ?? '' })}
            </Text>
            <Pressable accessibilityRole="button" onPress={onCancel} style={s.cancel}>
              <Text style={s.cancelText}>{t('player.sleepTimer.cancel')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={s.grid}>
          {presetRows.map((row, rowIndex) => (
            <View key={rowIndex} style={s.gridRow}>
              {row.map((minutes) => (
                <Pressable
                  key={minutes}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedPreset === minutes }}
                  onPress={() => {
                    if (Platform.OS !== 'web') Vibration.vibrate(10);
                    onSelect(minutes);
                    showToast(t('player.sleepTimer.setToast'));
                  }}
                  style={({ pressed }) => [
                    s.chip,
                    selectedPreset === minutes && s.chipSelected,
                    pressed && (selectedPreset === minutes ? s.pressedSelected : s.pressed),
                  ]}
                >
                  <Text style={[s.chipText, selectedPreset === minutes && s.chipTextSelected]}>
                    {minutes < 60
                      ? t('player.sleepTimer.presetMinutes', { count: minutes })
                      : t('player.sleepTimer.presetHours', { count: minutes / 60 })}
                  </Text>
                  {selectedPreset === minutes ? <Text style={s.check}>✓</Text> : null}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedPreset === 'trackEnd' }}
          onPress={() => {
            if (Platform.OS !== 'web') Vibration.vibrate(10);
            onSelectTrackEnd();
            showToast(t('player.sleepTimer.trackEndToast'));
          }}
          style={({ pressed }) => [
            s.trackEnd,
            selectedPreset === 'trackEnd' && s.chipSelected,
            pressed && (selectedPreset === 'trackEnd' ? s.pressedSelected : s.pressed),
          ]}
        >
          <Text style={[s.chipText, selectedPreset === 'trackEnd' && s.chipTextSelected]}>
            {t('player.sleepTimer.trackEnd')}
          </Text>
          {selectedPreset === 'trackEnd' ? <Text style={s.check}>✓</Text> : null}
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  sheet: { backgroundColor: '#141414', gap: 0 },
  content: { alignSelf: 'stretch', gap: 16 },
  active: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: 16, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  activeText: { flex: 1, color: '#C6E27A', fontSize: font.md, fontWeight: '600' },
  cancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md },
  cancelText: { color: colors.text, fontSize: font.md, fontWeight: '600' },
  grid: { gap: 12, marginBottom: 16 },
  gridRow: { flexDirection: 'row', gap: 12 },
  chip: { flex: 1, minWidth: 0, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, backgroundColor: '#242424', borderColor: colors.border, borderWidth: 1, borderRadius: radius.md },
  chipSelected: { backgroundColor: '#C6E27A', borderColor: '#C6E27A' },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  chipTextSelected: { color: '#000000', fontWeight: '700' },
  check: { color: '#000000', fontSize: font.md, fontWeight: '700' },
  trackEnd: { width: '100%', height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, backgroundColor: '#242424', borderColor: colors.border, borderWidth: 1, borderRadius: radius.md },
  pressed: { backgroundColor: '#2E2E2E' },
  pressedSelected: { opacity: 0.8 },
});
