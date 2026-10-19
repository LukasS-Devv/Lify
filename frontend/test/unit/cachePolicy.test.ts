import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isFresh,
  MAX_CACHE_ENTRIES,
  MAX_CACHE_VALUE_BYTES,
  shouldCache,
} from '../../src/services/catalog/cachePolicy';

test('shouldCache accepts payloads up to the limit', () => {
  assert.equal(shouldCache('x'.repeat(MAX_CACHE_VALUE_BYTES)), true);
});

test('shouldCache rejects oversized payloads', () => {
  assert.equal(shouldCache('x'.repeat(MAX_CACHE_VALUE_BYTES + 1)), false);
});

test('isFresh compares against the supplied clock', () => {
  assert.equal(isFresh(2_000, 1_000), true);
  assert.equal(isFresh(1_000, 1_000), false);
  assert.equal(isFresh(500, 1_000), false);
});

test('the entry cap stays bounded', () => {
  assert.ok(MAX_CACHE_ENTRIES > 0 && MAX_CACHE_ENTRIES <= 1000);
});
