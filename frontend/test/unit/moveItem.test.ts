import assert from 'node:assert/strict';
import test from 'node:test';
import { moveItem } from '../../src/utils/moveItem';

test('moveItem reorders one element without mutating the source', () => {
  const source = ['a', 'b', 'c', 'd'];
  assert.deepEqual(moveItem(source, 1, 3), ['a', 'c', 'd', 'b']);
  assert.deepEqual(source, ['a', 'b', 'c', 'd']);
});

test('moveItem leaves arrays unchanged for invalid or identical positions', () => {
  assert.deepEqual(moveItem(['a', 'b'], -1, 1), ['a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 0, 2), ['a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 1, 1), ['a', 'b']);
});
