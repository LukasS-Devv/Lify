import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getDb, historyRepo, settingsRepo } from '@/database';
import { exportBackup, importBackup } from '@/storage/backups/backup';
import { setAutoQueue } from '@/services/audio/controller';
import { DEFAULT_SETTINGS, type AppSettings } from '@/types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getDb().then((db) => settingsRepo.loadSettings(db)).then(setSettings).catch(() => {});
  }, []);

  const update = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    if (key === 'autoQueue') await setAutoQueue(value as boolean);
    else await settingsRepo.saveSetting(await getDb(), key, value);
  }, []);

  const guarded = useCallback(async (fn: () => Promise<string>) => {
    setBusy(true); setMessage(null);
    try { setMessage(await fn()); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Algo deu errado.'); }
    finally { setBusy(false); }
  }, []);

  const doExport = useCallback(() => guarded(async () => {
    const r = await exportBackup();
    return r.shared ? 'Backup gerado.' : `Backup salvo em ${r.uri}`;
  }), [guarded]);

  const doImport = useCallback(() => {
    Alert.alert(
      'Importar backup',
      'Isto substitui TODAS as playlists, favoritos e histórico atuais. Um backup de segurança será criado antes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Escolher arquivo', style: 'destructive', onPress: () => guarded(async () => {
          const r = await importBackup();
          if (r.status === 'cancelled') return 'Importação cancelada.';
          const s = await settingsRepo.loadSettings(await getDb());
          setSettings(s);
          return 'Backup importado com sucesso.';
        }) },
      ],
    );
  }, [guarded]);

  const clearHistory = useCallback(() => guarded(async () => {
    await historyRepo.clearHistory(await getDb());
    return 'Histórico limpo.';
  }), [guarded]);

  return { settings, update, busy, message, doExport, doImport, clearHistory };
}
