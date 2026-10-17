import test from 'node:test';
import assert from 'node:assert/strict';
import { gradientFor, hslToHex, tintFor } from '../../src/utils/color';
import { shuffled, uniqueBy } from '../../src/utils/array';

test('hslToHex converte cores conhecidas', () => {
  assert.equal(hslToHex(0, 1, 0.5), '#ff0000');
  assert.equal(hslToHex(120, 1, 0.5), '#00ff00');
  assert.equal(hslToHex(240, 1, 0.5), '#0000ff');
});

test('tintFor é estável e gera hex válido', () => {
  assert.equal(tintFor('youtube:abc'), tintFor('youtube:abc'));
  assert.match(tintFor('x'), /^#[0-9a-f]{6}$/);
  assert.deepEqual(gradientFor('x', '#000000')[1], '#000000');
});

test('shuffled mantém os itens e não altera a entrada', () => {
  const a = [1, 2, 3, 4, 5];
  const b = shuffled(a);
  assert.deepEqual([...b].sort(), a);
  assert.deepEqual(a, [1, 2, 3, 4, 5]);
});

test('uniqueBy mantém a primeira ocorrência', () => {
  assert.deepEqual(uniqueBy([{ id: 'a', n: 1 }, { id: 'b', n: 2 }, { id: 'a', n: 3 }], (x) => x.id).map((x) => x.n), [1, 2]);
});
