import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTO_BACKUP_FILE_NAME, portableBackupFileName } from '../../src/storage/backups/fileNames';

test('automatic backups always replace the same local filename', () => {
  assert.equal(portableBackupFileName('lify-auto-backup', new Date(2026, 0, 2, 3, 4, 5)), AUTO_BACKUP_FILE_NAME);
  assert.equal(portableBackupFileName('lify-auto-backup', new Date(2026, 6, 8, 9, 10, 11)), AUTO_BACKUP_FILE_NAME);
});

test('manual portable backups keep timestamped filenames for export', () => {
  assert.equal(
    portableBackupFileName('lify-backup', new Date(2026, 0, 2, 3, 4, 5, 6)),
    'lify-backup-20260102-030405006.lifybackup',
  );
});
