import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getDb, historyRepo, settingsRepo } from '@/database';
import { exportBackup, importBackup } from '@/storage/backups/backup';
import { setAutoQueue } from '@/services/audio/controller';
import { normalizeStreamServerUrl } from '@/services/catalog/server';
import { DEFAULT_SETTINGS, type AppSettings } from '@/types';
import { setLanguage, t } from '@/i18n';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getDb()
      .then((db) => settingsRepo.loadSettings(db))
      .then(setSettings)
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : t('settings.loadFailed'));
      });
  }, []);

  const update = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setMessage(null);
    try {
      if (key === 'autoQueue') await setAutoQueue(value as boolean);
      else await settingsRepo.saveSetting(await getDb(), key, value);
      if (key === 'language') setLanguage(value as AppSettings['language']);
      setSettings((s) => ({ ...s, [key]: value }));
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('settings.saveFailed'));
      return false;
    }
  }, []);

  const saveCustomServer = useCallback(async (value: string) => {
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeStreamServerUrl(value);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('settings.invalidServer'));
      return;
    }

    if (await update('customStreamServerUrl', normalizedUrl)) {
      if (!(await update('streamServerMode', 'custom'))) return;
      setMessage(t('settings.serverSelected'));
    }
  }, [update]);

  const guarded = useCallback(async (fn: () => Promise<string>) => {
    setBusy(true); setMessage(null);
    try { setMessage(await fn()); }
    catch (e) { setMessage(e instanceof Error ? e.message : t('common.error')); }
    finally { setBusy(false); }
  }, []);

  const doExport = useCallback(() => guarded(async () => {
    const r = await exportBackup();
    return r.shared ? t('settings.exported') : t('settings.exportedAt', { uri: r.uri });
  }), [guarded]);

  const doImport = useCallback(() => {
    Alert.alert(
      t('settings.importTitle'),
      t('settings.importMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.importPick'), style: 'destructive', onPress: () => guarded(async () => {
          const r = await importBackup();
          if (r.status === 'cancelled') return t('settings.importCancelled');
          const s = await settingsRepo.loadSettings(await getDb());
          setSettings(s);
          setLanguage(s.language);
          return t('settings.importDone');
        }) },
      ],
    );
  }, [guarded]);

  const clearHistory = useCallback(() => guarded(async () => {
    await historyRepo.clearHistory(await getDb());
    return t('settings.historyCleared');
  }), [guarded]);

  return { settings, update, saveCustomServer, busy, message, doExport, doImport, clearHistory };
}
