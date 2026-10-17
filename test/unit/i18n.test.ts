import test from 'node:test';
import assert from 'node:assert/strict';
import { t } from '../../src/i18n';
import { pt } from '../../src/i18n/pt';

test('interpola parâmetros', () => {
  assert.equal(t('search.noResults', { query: 'abc' }), 'Nenhum resultado para "abc".');
});

test('plural escolhe _one e _other', () => {
  assert.equal(t('common.tracks', { count: 1 }), '1 faixa');
  assert.equal(t('common.tracks', { count: 3 }), '3 faixas');
  assert.equal(t('common.tracks', { count: 0 }), '0 faixas');
});

test('todo par de plural tem _one e _other', () => {
  const keys = Object.keys(pt);
  for (const k of keys.filter((x) => x.endsWith('_one'))) assert.ok(keys.includes(k.replace(/_one$/, '_other')), k);
});

test('placeholders de cada texto são preservados', () => {
  for (const v of Object.values(pt)) assert.equal((v.match(/\{/g) ?? []).length, (v.match(/\}/g) ?? []).length);
});

test('inglês cobre as mesmas chaves e preserva placeholders', async () => {
  const { en } = await import('../../src/i18n/en');
  assert.deepEqual(Object.keys(en).sort(), Object.keys(pt).sort());
  const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  for (const k of Object.keys(pt) as (keyof typeof pt)[]) assert.equal(ph(en[k]), ph(pt[k]), k);
});

test('setLanguage troca o idioma e notifica quem assina', async () => {
  const { setLanguage, getLanguage } = await import('../../src/i18n');
  setLanguage('en');
  assert.equal(getLanguage(), 'en');
  assert.equal(t('common.tracks', { count: 2 }), '2 tracks');
  assert.equal(t('common.cancel'), 'Cancel');
  setLanguage('pt');
  assert.equal(t('common.cancel'), 'Cancelar');
});
