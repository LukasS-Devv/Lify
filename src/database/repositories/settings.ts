import { DEFAULT_SETTINGS, type AppSettings } from '@/types';
import type { Db } from '../types';

export async function loadSettings(db: Db): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const out: AppSettings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    try {
      (out as unknown as Record<string, unknown>)[key] = JSON.parse(value);
    } catch {
      /* valor corrompido: mantém o default */
    }
  }
  return out;
}

export async function saveSetting<K extends keyof AppSettings>(db: Db, key: K, value: AppSettings[K]): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, JSON.stringify(value));
}
