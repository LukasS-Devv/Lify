import { getDb, settingsRepo } from '@/database';
import { createPortableBackupFile, removeLegacyAutomaticBackups } from './backup';
import { isAutoBackupDue } from './schedule';

export const AUTO_BACKUP_TASK = 'lify-auto-backup';
let running: Promise<boolean> | null = null;

export async function runAutoBackupIfDue(): Promise<boolean> {
  if (running) return running;
  running = (async () => {
    const db = await getDb();
    const settings = await settingsRepo.loadSettings(db);
    const now = Date.now();
    if (!isAutoBackupDue(settings.autoBackupIntervalDays, settings.lastAutoBackupAt, now)) return false;
    await createPortableBackupFile('lify-auto-backup');
    await settingsRepo.saveSetting(db, 'lastAutoBackupAt', now);
    try {
      await removeLegacyAutomaticBackups();
    } catch (error) {
      console.warn('[backup] Automatic backup succeeded but old backups could not be removed', error);
    }
    return true;
  })().finally(() => {
    running = null;
  });
  return running;
}

export async function configureAutoBackup(intervalDays: number): Promise<void> {
  if (![0, 1, 7, 30].includes(intervalDays)) {
    throw new RangeError(`Unsupported automatic backup interval: ${intervalDays}`);
  }
}

export async function ensureAutoBackupScheduled(): Promise<void> {
  const settings = await settingsRepo.loadSettings(await getDb());
  await configureAutoBackup(settings.autoBackupIntervalDays);
  await runAutoBackupIfDue();
}
