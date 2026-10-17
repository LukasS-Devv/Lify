import { useSyncExternalStore } from 'react';
import { en } from './en';
import { pt, type Dictionary, type TKey } from './pt';

export type { Dictionary, TKey };
export type Language = 'pt' | 'en';
export const LANGUAGES: readonly Language[] = ['pt', 'en'];

/** `common.tracks_one` / `common.tracks_other` → `common.tracks` (chave-base de plural). */
type PluralBase<K> = K extends `${infer B}_${'one' | 'other'}` ? B : never;
export type AnyKey = TKey | PluralBase<TKey>;

const dictionaries: Record<Language, Dictionary> = { pt, en };

let current: Language = 'pt';
const listeners = new Set<() => void>();

export const getLanguage = (): Language => current;

export function setLanguage(next: Language): void {
  if (!dictionaries[next] || next === current) return;
  current = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Chame no topo de componentes com texto: re-renderiza ao trocar o idioma. */
export function useTranslation(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}

export type TParams = Record<string, string | number>;

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/**
 * Traduz uma chave. Com `params.count`, escolhe `<chave>_one` / `<chave>_other`.
 * Funciona fora de componentes (serviços, headless JS) — não depende de React.
 */
export function t(key: AnyKey, params?: TParams): string {
  const dict = dictionaries[current] as Record<string, string>;
  let k: string = key;
  if (params && typeof params.count === 'number') {
    const plural = `${key}_${params.count === 1 ? 'one' : 'other'}`;
    if (plural in dict) k = plural;
  }
  const template = dict[k] ?? (pt as Record<string, string>)[k] ?? k;
  return interpolate(template, params);
}
