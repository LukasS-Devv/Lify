import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { Button, Icon, type IconName } from '@/components';
import { useSettings } from '@/features/settings/useSettings';
import { LIFY_STREAM_SERVER_URL } from '@/services/catalog/server';
import { t, useTranslation } from '@/i18n';
import { colors, font, layout, radius, spacing } from '@/theme/tokens';

export default function Settings() {
  useTranslation();
  const { settings, update, saveCustomServer, busy, message, doExport, doImport, clearHistory } = useSettings();
  const [customServerUrl, setCustomServerUrl] = useState(settings.customStreamServerUrl);
  useEffect(() => { setCustomServerUrl(settings.customStreamServerUrl); }, [settings.customStreamServerUrl]);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={s.content}>
      <Section title={t('settings.language')} hint={t('settings.languageHint')}>
        <RadioRow label={t('settings.portuguese')} selected={settings.language === 'pt'} onPress={() => update('language', 'pt')} />
        <RadioRow label={t('settings.english')} selected={settings.language === 'en'} onPress={() => update('language', 'en')} />
      </Section>

      <Section title={t('settings.playback')}>
        <Text style={s.label}>{t('settings.playbackMode')}</Text>
        <RadioRow label={t('settings.playbackDataSaver')} selected={settings.playbackMode === 'dataSaver'} onPress={() => update('playbackMode', 'dataSaver')} />
        <RadioRow label={t('settings.playbackStandard')} selected={settings.playbackMode === 'standard'} onPress={() => update('playbackMode', 'standard')} />
        <Text style={s.hint}>{t('settings.playbackModeHint')}</Text>
        <ToggleRow icon="infinite" label={t('settings.autoQueue')} hint={t('settings.autoQueueHint')}
          value={settings.autoQueue} onChange={(v) => update('autoQueue', v)} />
        <ToggleRow icon="time-outline" label={t('settings.history')} hint={t('settings.historyHint')}
          value={settings.historyEnabled} onChange={(v) => update('historyEnabled', v)} />
      </Section>

      <Section title={t('settings.server')} hint={t('settings.serverHint')}>
        <RadioRow label={t('settings.serverLify')} selected={settings.streamServerMode === 'lify'} onPress={() => update('streamServerMode', 'lify')} />
        <Text selectable style={s.address}>{LIFY_STREAM_SERVER_URL}</Text>
        <RadioRow label={t('settings.serverCustom')} selected={settings.streamServerMode === 'custom'} onPress={() => update('streamServerMode', 'custom')} />
        {settings.streamServerMode === 'custom' ? (
          <View style={{ gap: spacing.sm }}>
            <TextInput
              accessibilityLabel={t('settings.serverCustomA11y')}
              autoCapitalize="none" autoCorrect={false} keyboardType="url"
              onChangeText={setCustomServerUrl} value={customServerUrl}
              placeholder="https://meu-servidor.example.com" placeholderTextColor={colors.textFaint} style={s.input}
            />
            <Button label={t('settings.serverSave')} onPress={() => saveCustomServer(customServerUrl)} disabled={busy} />
            <Text style={s.hint}>{t('settings.serverCustomHint')}</Text>
          </View>
        ) : null}
      </Section>

      <Section title={t('settings.backup')} hint={t('settings.backupHint')}>
        <Button icon="share-outline" label={t('settings.export')} onPress={doExport} disabled={busy} />
        <Button icon="download-outline" variant="secondary" label={t('settings.import')} onPress={doImport} disabled={busy} />
      </Section>

      <Section title={t('settings.data')}>
        <Button icon="trash-outline" variant="danger" label={t('settings.clearHistory')} onPress={clearHistory} disabled={busy} />
      </Section>

      {message ? <Text style={s.msg}>{message}</Text> : null}

      <Text style={s.version}>Lify · {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}</Text>
    </ScrollView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text accessibilityRole="header" style={s.section}>{title}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function ToggleRow({ icon, label, hint, value, onChange }: { icon: IconName; label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.row}>
      <Icon name={icon} size={22} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.elevated }} thumbColor={colors.text} />
    </View>
  );
}

function RadioRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={s.row}>
      <View style={[s.radio, selected && s.radioOn]}>{selected ? <View style={s.radioDot} /> : null}</View>
      <Text style={s.label}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: layout.listBottomPad + spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  section: { color: colors.text, fontSize: font.lg, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: font.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  label: { color: colors.text, fontSize: font.lg },
  address: { color: colors.textMuted, fontSize: font.sm, marginLeft: 32 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  input: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: font.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  msg: { color: colors.accent, fontSize: font.md, textAlign: 'center' },
  version: { color: colors.textFaint, fontSize: font.sm, textAlign: 'center', marginTop: spacing.md },
});
