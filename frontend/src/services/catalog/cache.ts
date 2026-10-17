import { getDb } from '@/database';

interface CacheRow {
  value: string;
  expires_at: number;
}

const MAX_CACHE_ENTRIES = 200;
const pending = new Map<string, Promise<unknown>>();

async function readCache<T>(key: string): Promise<{ value: T; fresh: boolean } | null> {
  try {
    const row = await (await getDb()).getFirstAsync<CacheRow>(
      'SELECT value, expires_at FROM catalog_cache WHERE cache_key = ?',
      key,
    );
    if (!row) return null;
    return { value: JSON.parse(row.value) as T, fresh: row.expires_at > Date.now() };
  } catch (error) {
    console.warn('[catalog-cache] Could not read cached catalog data', error);
    return null;
  }
}

async function writeCache(key: string, value: unknown, ttlMs: number): Promise<void> {
  try {
    const db = await getDb();
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO catalog_cache (cache_key, value, expires_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         value = excluded.value,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at`,
      key,
      JSON.stringify(value),
      now + ttlMs,
      now,
    );
    await db.runAsync(
      `DELETE FROM catalog_cache
       WHERE cache_key IN (
         SELECT cache_key FROM catalog_cache
         ORDER BY updated_at DESC LIMIT -1 OFFSET ?
       )`,
      MAX_CACHE_ENTRIES,
    );
  } catch (error) {
    console.warn('[catalog-cache] Could not persist catalog data', error);
  }
}

function refresh<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;

  const request = loader()
    .then(async (value) => {
      if (!Array.isArray(value) || value.length > 0) {
        await writeCache(key, value, ttlMs);
      }
      return value;
    })
    .finally(() => {
      if (pending.get(key) === request) pending.delete(key);
    });
  pending.set(key, request);
  return request;
}

export async function cachedCatalogRequest<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await readCache<T>(key);
  if (cached) {
    if (!cached.fresh) {
      void refresh(key, ttlMs, loader).catch((error: unknown) => {
        console.warn('[catalog-cache] Background refresh failed', error);
      });
    }
    return cached.value;
  }
  return refresh(key, ttlMs, loader);
}
