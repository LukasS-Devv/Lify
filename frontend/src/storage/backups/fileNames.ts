export const AUTO_BACKUP_FILE_NAME = 'lify-auto-backup.lifybackup';

export function portableBackupFileName(prefix: string, timestamp: Date): string {
  if (prefix === 'lify-auto-backup') return AUTO_BACKUP_FILE_NAME;
  const pad = (value: number) => String(value).padStart(2, '0');
  const milliseconds = String(timestamp.getMilliseconds()).padStart(3, '0');
  return `${prefix}-${timestamp.getFullYear()}${pad(timestamp.getMonth() + 1)}${pad(timestamp.getDate())}-${pad(timestamp.getHours())}${pad(timestamp.getMinutes())}${pad(timestamp.getSeconds())}${milliseconds}.lifybackup`;
}
