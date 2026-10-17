import type { AppSettings } from '@/types';
import { CatalogError } from './types';
import { t } from '@/i18n';

export function normalizeStreamServerUrl(value: string): string {
  const input = value.trim();
  if (!input) throw new CatalogError(t('catalog.serverRequired'), 'parse');

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new CatalogError(t('catalog.invalidUrl'), 'parse');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new CatalogError(t('catalog.badProtocol'), 'parse');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new CatalogError(t('catalog.baseOnly'), 'parse');
  }
  if (parsed.pathname !== '/') {
    throw new CatalogError(t('catalog.noPath'), 'parse');
  }

  return parsed.origin;
}

export function getStreamServerUrl(settings: AppSettings): string {
  return normalizeStreamServerUrl(settings.customStreamServerUrl);
}

export function isStreamServerConfigured(settings: AppSettings): boolean {
  try {
    getStreamServerUrl(settings);
    return true;
  } catch (error) {
    if (error instanceof CatalogError) return false;
    throw error;
  }
}
