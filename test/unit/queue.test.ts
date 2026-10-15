import test from 'node:test';
import assert from 'node:assert/strict';
import { T } from './helpers';
import * as q from '../../src/services/audio/queue';
import { formatDuration } from '../../src/utils/track';

const ids = (s: q.QueueState) => s.items.map((t) => t.sourceId).join('');

test('fila: setQueue / playNext / enqueue / removeAt', () => {
  let s = q.setQueue([T('a'), T('b'), T('c')], 1);
  assert.equal(q.currentOf(s)?.sourceId, 'b');
  s = q.playNext(s, T('x'));
  assert.equal(ids(s), 'abxc');
  s = q.enqueue(s, [T('y')]);
  assert.equal(ids(s), 'abxcy');
  s = q.removeAt(s, 0); // antes do atual → índice desce
  assert.equal(q.currentOf(s)?.sourceId, 'b');
  s = q.removeAt(s, s.index); // remove o atual → próxima assume
  assert.equal(q.currentOf(s)?.sourceId, 'x');
  assert.equal(q.removeAt(q.setQueue([T('z')]), 0), q.emptyQueue);
});

test('fila: next/prev respeitando repeat', () => {
  const s = q.setQueue([T('a'), T('b')], 1);
  assert.equal(q.nextIndex(s, 'off', false), null);
  assert.equal(q.nextIndex(s, 'all', false), 0);
  assert.equal(q.nextIndex(s, 'one', false), 1);
  assert.equal(q.nextIndex(s, 'one', true), null); // pular manual ignora repeat one
  assert.equal(q.prevIndex(q.setQueue([T('a'), T('b')], 0), 'off'), null);
  assert.equal(q.prevIndex(q.setQueue([T('a'), T('b')], 0), 'all'), 1);
  assert.equal(q.nextIndex(q.emptyQueue, 'all', true), null);
});

test('fila: shuffleRest mantém o passado e a faixa atual', () => {
  const s = q.shuffleRest(q.setQueue([T('a'), T('b'), T('c'), T('d'), T('e')], 1), () => 0);
  assert.equal(ids(s).slice(0, 2), 'ab');
  assert.equal(s.index, 1);
  assert.equal([...ids(s)].sort().join(''), 'abcde');
});

test('formatDuration', () => {
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(null), '--:--');
});
