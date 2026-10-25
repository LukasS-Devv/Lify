export function isAutoBackupDue(
  intervalDays: 0 | 1 | 7 | 30,
  lastAutoBackupAt: number | null,
  now = Date.now(),
): boolean {
  if (intervalDays === 0) return false;
  if (lastAutoBackupAt === null) return true;
  return now >= lastAutoBackupAt + intervalDays * 24 * 60 * 60 * 1000;
}
