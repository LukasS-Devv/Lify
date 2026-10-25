import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getDb, historyRepo, settingsRepo } from '@/database';
import { exportBackup, importBackup } from '@/storage/backups/backup';
import { configureAutoBackup } from '@/storage/backups/autoBackupTask';
import { cleanupUnreferencedLocalAudio } from '@/storage/localAudioCleanup';
import { isStreamServerConfigured, normalizeStreamServerUrl } from '@/services/catalog/server';
import { useStartupStore } from '@/services/startup';
import { DEFAULT_SETTINGS, type AppSettings } from '@/types';
import { setLanguage, t } from '@/i18n';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [serverSaveState, setServerSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    getDb()
      .then((db) => settingsRepo.loadSettings(db))
      .then((loadedSettings) => {
        setSettings(loadedSettings);
        useStartupStore.getState().setStreamServerConfigured(isStreamServerConfigured(loadedSettings));
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : t('settings.loadFailed'));
      });
  }, []);

  const update = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setMessage(null);
    try {
      if (key === 'autoBackupIntervalDays') {
        if (typeof value !== 'number') throw new TypeError('Automatic backup interval must be numeric');
        await configureAutoBackup(value);
      }
      await settingsRepo.saveSetting(await getDb(), key, value);
      if (key === 'language') setLanguage(value as AppSettings['language']);
      setSettings((s) => ({ ...s, [key]: value }));
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('settings.saveFailed'));
      return false;
    }
  }, []);

  const saveCustomServer = useCallback(async (value: string) => {
    if (busy) return;
    setBusy(true);
    setServerSaveState('saving');
    setMessage(null);

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeStreamServerUrl(value);
    } catch (error) {
      setServerSaveState('idle');
      setMessage(error instanceof Error ? error.message : t('settings.invalidServer'));
      setBusy(false);
      return;
    }

    try {
      if (await update('customStreamServerUrl', normalizedUrl)) {
        useStartupStore.getState().setStreamServerConfigured(true);
        setServerSaveState('saved');
        setMessage(t('settings.serverSelected'));
      } else {
        setServerSaveState('idle');
      }
    } finally {
      setBusy(false);
    }
  }, [busy, update]);

  const resetServerSaveState = useCallback(() => setServerSaveState('idle'), []);

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
          await cleanupUnreferencedLocalAudio();
          const s = await settingsRepo.loadSettings(await getDb());
          await configureAutoBackup(s.autoBackupIntervalDays);
          setSettings(s);
          setLanguage(s.language);
          useStartupStore.getState().setStreamServerConfigured(isStreamServerConfigured(s));
          return t('settings.importDone');
        }) },
      ],
    );
  }, [guarded]);

  const clearHistory = useCallback(() => {
    Alert.alert(
      t('settings.clearHistoryConfirmTitle'),
      t('settings.clearHistoryConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearHistory'),
          style: 'destructive',
          onPress: () => {
            void guarded(async () => {
              await historyRepo.clearHistory(await getDb());
              return t('settings.historyCleared');
            });
          },
        },
      ],
    );
  }, [guarded]);

  return {
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
  };
}
