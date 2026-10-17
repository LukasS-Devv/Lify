import type { AppSettings } from '@/types';
import { CatalogError } from './types';
import { t } from '@/i18n';

export const DEFAULT_LOCAL_STREAM_SERVER_URL = 'http://10.0.2.2:4000';

export const LIFY_STREAM_SERVER_URL =
  process.env.EXPO_PUBLIC_LIFY_SERVER_URL?.trim()
  || process.env.EXPO_PUBLIC_STREAM_SERVER_URL?.trim()
  || DEFAULT_LOCAL_STREAM_SERVER_URL;

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
  const configuredUrl = settings.streamServerMode === 'custom'
    ? settings.customStreamServerUrl
    : LIFY_STREAM_SERVER_URL;

  try {
    return normalizeStreamServerUrl(configuredUrl);
  } catch (error) {
    if (error instanceof CatalogError) {
      throw new CatalogError(
        settings.streamServerMode === 'custom'
          ? error.message
          : t('catalog.serverNotConfigured'),
        error.code,
      );
    }
    throw error;
  }
}
