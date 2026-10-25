import assert from 'node:assert/strict';
import test from 'node:test';
import { isAutoBackupDue } from '../../src/storage/backups/schedule';

const DAY_MS = 24 * 60 * 60 * 1000;

test('automatic backups are disabled for the off interval', () => {
  assert.equal(isAutoBackupDue(0, null, 100 * DAY_MS), false);
});

test('a first automatic backup is due immediately', () => {
  assert.equal(isAutoBackupDue(1, null, 1), true);
});

test('automatic backups wait until the configured interval has elapsed', () => {
  assert.equal(isAutoBackupDue(7, 10 * DAY_MS, 16 * DAY_MS), false);
  assert.equal(isAutoBackupDue(7, 10 * DAY_MS, 17 * DAY_MS), true);
});
