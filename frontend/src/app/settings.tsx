import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { Button, Icon, type IconName } from '@/components';
import { useSettings } from '@/features/settings/useSettings';
import { t, useTranslation } from '@/i18n';
import { colors, font, layout, radius, spacing } from '@/theme/tokens';
import { Dialog } from '@/components/Overlays';

export default function Settings() {
  useTranslation();
  const {
    settings,
    update,
    saveCustomServer,
    serverSaveState,
    resetServerSaveState,
    busy,
    message,
    doExport,
    doImport,
    clearHistory,
  } = useSettings();
  const [customServerUrl, setCustomServerUrl] = useState(settings.customStreamServerUrl);
  const [showExportOptions, setShowExportOptions] = useState(false);
  useEffect(() => { setCustomServerUrl(settings.customStreamServerUrl); }, [settings.customStreamServerUrl]);

  return (
    <>
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={s.content}>
      <Section title={t('settings.language')} hint={t('settings.languageHint')}>
        <RadioRow label={t('settings.portuguese')} selected={settings.language === 'pt'} onPress={() => update('language', 'pt')} />
        <RadioRow label={t('settings.english')} selected={settings.language === 'en'} onPress={() => update('language', 'en')} />
      </Section>

      <Section title={t('settings.playback')}>
        <Text style={s.hint}>{t('settings.dataSaverEnabled')}</Text>
        <ToggleRow icon="time-outline" label={t('settings.history')} hint={t('settings.historyHint')}
          value={settings.historyEnabled} onChange={(v) => update('historyEnabled', v)} />
      </Section>

      <Section title={t('settings.server')} hint={t('settings.serverHint')}>
        <TextInput
          accessibilityLabel={t('settings.serverCustomA11y')}
          autoCapitalize="none" autoCorrect={false} keyboardType="url"
          onChangeText={(value) => {
            setCustomServerUrl(value);
            resetServerSaveState();
          }} value={customServerUrl}
          placeholder="https://server.example.com" placeholderTextColor={colors.textFaint}
          style={[s.input, serverSaveState === 'saved' && s.serverSavedInput]}
        />
        <Button
          label={t(serverSaveState === 'saved' ? 'settings.serverSaved' : 'settings.serverSave')}
          icon={serverSaveState === 'saved' ? 'checkmark' : undefined}
          onPress={() => saveCustomServer(customServerUrl)}
          loading={serverSaveState === 'saving'}
          disabled={busy}
        />
        {serverSaveState === 'saved' ? (
          <Text accessibilityRole="text" style={s.serverSaved}>{t('settings.serverSelected')}</Text>
        ) : null}
        <Text style={s.hint}>{t('settings.serverCustomHint')}</Text>
      </Section>

      <Section title={t('settings.backup')} hint={t(Platform.OS === 'web' ? 'settings.webBackupHint' : 'settings.backupHint')}>
        <Text style={s.label}>{t('settings.autoBackupInterval')}</Text>
        {([0, 1, 7, 30] as const).map((days) => (
          <RadioRow
            key={days}
            label={t(`settings.autoBackupInterval.${days}`)}
            selected={settings.autoBackupIntervalDays === days}
            onPress={() => void update('autoBackupIntervalDays', days)}
          />
        ))}
        {settings.lastAutoBackupAt ? (
          <Text style={s.hint}>{t('settings.lastAutoBackup', {
            date: new Date(settings.lastAutoBackupAt).toLocaleString(),
          })}</Text>
        ) : null}
        <Button icon="share-outline" label={t('settings.export')} onPress={() => setShowExportOptions(true)} disabled={busy} />
        <Button icon="download-outline" variant="secondary" label={t('settings.import')} onPress={doImport} disabled={busy} />
      </Section>

      <Section title={t('settings.data')}>
        <Button icon="trash-outline" variant="danger" label={t('settings.clearHistory')} onPress={clearHistory} disabled={busy} />
      </Section>

      {message ? <Text style={s.msg}>{message}</Text> : null}

      <Text style={s.version}>Lify · {t('settings.version', { version: Constants.expoConfig?.version ?? '1.1.2' })}</Text>
    </ScrollView>
    <Dialog
      visible={showExportOptions}
      onClose={() => setShowExportOptions(false)}
      title={t('settings.exportOptionsTitle')}
    >
          <Text style={s.hint}>{t('settings.exportOptionsMessage')}</Text>
          <Button
            icon="download-outline"
            label={t('settings.exportWithDownloads')}
            onPress={() => {
              setShowExportOptions(false);
              void doExport(true);
            }}
            disabled={busy}
          />
          <Button
            icon="flash-outline"
            variant="secondary"
            label={t('settings.exportWithoutDownloads')}
            onPress={() => {
              setShowExportOptions(false);
              void doExport(false);
            }}
            disabled={busy}
          />
          <Button
            variant="secondary"
            label={t('common.cancel')}
            onPress={() => setShowExportOptions(false)}
            disabled={busy}
          />
    </Dialog>
    </>
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
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  input: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: font.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  serverSavedInput: { opacity: 0.5 },
  msg: { color: colors.accent, fontSize: font.md, textAlign: 'center' },
  serverSaved: { color: colors.accent, fontSize: font.sm, textAlign: 'center' },
  version: { color: colors.textFaint, fontSize: font.sm, textAlign: 'center', marginTop: spacing.md },
});
