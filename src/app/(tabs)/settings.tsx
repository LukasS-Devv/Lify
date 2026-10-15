import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Screen } from '@/components';
import { useSettings } from '@/features/settings/useSettings';
import { colors, font, spacing } from '@/theme/tokens';

export default function Settings() {
  const { settings, update, busy, message, doExport, doImport, clearHistory } = useSettings();

  return (
    <Screen title="Ajustes">
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <Row label="Fila automática (músicas relacionadas)" value={settings.autoQueue} onChange={(v) => update('autoQueue', v)} />
        <Row label="Salvar histórico de reprodução" value={settings.historyEnabled} onChange={(v) => update('historyEnabled', v)} />

        <Text style={s.section}>Backup</Text>
        <Text style={s.hint}>Playlists, favoritos e histórico ficam num único arquivo .db neste aparelho.</Text>
        <Button label="Exportar backup" onPress={doExport} disabled={busy} />
        <Button label="Importar backup" variant="secondary" onPress={doImport} disabled={busy} />

        <Text style={s.section}>Dados</Text>
        <Button label="Limpar histórico" variant="danger" onPress={clearHistory} disabled={busy} />

        {message ? <Text style={s.msg}>{message}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent }} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label: { color: colors.text, fontSize: font.lg, flex: 1 },
  section: { color: colors.text, fontSize: font.xl, fontWeight: '700', marginTop: spacing.md },
  hint: { color: colors.textMuted, fontSize: font.md },
  msg: { color: colors.accent, fontSize: font.md },
});
