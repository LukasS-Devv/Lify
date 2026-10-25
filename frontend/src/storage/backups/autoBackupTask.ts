import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { getDb, settingsRepo } from '@/database';
import { createPortableBackupFile, removeLegacyAutomaticBackups } from './backup';
import { isAutoBackupDue } from './schedule';

export const AUTO_BACKUP_TASK = 'lify-auto-backup';
const MINIMUM_TASK_INTERVAL_MINUTES = 15;

let running: Promise<boolean> | null = null;

export async function runAutoBackupIfDue(): Promise<boolean> {
  if (running) return running;
  running = (async () => {
    const db = await getDb();
    const settings = await settingsRepo.loadSettings(db);
    const intervalDays = settings.autoBackupIntervalDays;
    const now = Date.now();
    if (!isAutoBackupDue(intervalDays, settings.lastAutoBackupAt, now)) return false;

    await createPortableBackupFile('lify-auto-backup');
    await settingsRepo.saveSetting(db, 'lastAutoBackupAt', now);
    try {
      await removeLegacyAutomaticBackups();
    } catch (error) {
      console.warn('[backup] Automatic backup succeeded but old automatic backups could not be removed', error);
    }
    return true;
  })().finally(() => {
    running = null;
  });
  return running;
}

TaskManager.defineTask(AUTO_BACKUP_TASK, async () => {
  try {
    await runAutoBackupIfDue();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error('[backup] Scheduled automatic backup failed', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function configureAutoBackup(intervalDays: number): Promise<void> {
  if (intervalDays === 0) {
    await BackgroundTask.unregisterTaskAsync(AUTO_BACKUP_TASK);
    return;
  }
  if (![1, 7, 30].includes(intervalDays)) {
    throw new RangeError(`Unsupported automatic backup interval: ${intervalDays}`);
  }
  await BackgroundTask.registerTaskAsync(AUTO_BACKUP_TASK, {
    minimumInterval: Math.max(MINIMUM_TASK_INTERVAL_MINUTES, intervalDays * 24 * 60),
  });
}

export async function ensureAutoBackupScheduled(): Promise<void> {
  const settings = await settingsRepo.loadSettings(await getDb());
  await configureAutoBackup(settings.autoBackupIntervalDays);
  await runAutoBackupIfDue();
}
