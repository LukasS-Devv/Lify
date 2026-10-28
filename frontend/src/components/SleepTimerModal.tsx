import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { BottomSheet } from './Overlays';

const PRESETS = [5, 15, 30, 45, 60, 120];

export function SleepTimerModal({ visible, endsAt, remainingTime, onSelect, onCancel, onClose }: {
  visible: boolean;
  endsAt: number | null;
  remainingTime: string | null;
  onSelect: (minutes: number) => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  useTranslation();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('player.sleepTimer.title')}>
        {endsAt ? <Text style={s.active}>{t('player.sleepTimer.active', { time: remainingTime ?? '' })}</Text> : null}
        <View>
          {PRESETS.map((minutes) => (
            <Pressable
              key={minutes}
              accessibilityRole="button"
              onPress={() => onSelect(minutes)}
              style={({ pressed }) => [s.option, pressed && { opacity: 0.65 }]}
            >
              <Icon name="timer-outline" size={22} color={colors.textMuted} />
              <Text style={s.optionText}>
                {minutes < 60
                  ? t('player.sleepTimer.minutes', { count: minutes })
                  : t('player.sleepTimer.hours', { count: minutes / 60 })}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.actions}>
          {endsAt ? <Button label={t('player.sleepTimer.cancel')} variant="danger" onPress={onCancel} /> : null}
          <Button label={t('common.close')} variant="secondary" onPress={onClose} />
        </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  active: { color: colors.accent, fontSize: font.md, fontWeight: '600' },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  optionText: { color: colors.text, fontSize: font.lg, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm },
});
