/**
 * Regras puras do cache de catálogo (sem dependências nativas → testável em Node).
 */

/** Payloads maiores que isso não são gravados: uma playlist gigante inflava o banco. */
export const MAX_CACHE_VALUE_BYTES = 512 * 1024;

/** Poda por quantidade: mantém as N entradas mais recentes. */
export const MAX_CACHE_ENTRIES = 200;

/** Uma entrada só é gravada se couber no limite. */
export function shouldCache(serialized: string): boolean {
  return serialized.length <= MAX_CACHE_VALUE_BYTES;
}

/** `expires_at` no futuro significa que a entrada ainda pode ser servida. */
export function isFresh(expiresAt: number, now: number = Date.now()): boolean {
  return expiresAt > now;
}
