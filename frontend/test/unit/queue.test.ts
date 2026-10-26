import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendRecommended,
  dropRecommended,
  emptyQueue,
  enqueue,
  nextIndex,
  playNext,
  prevIndex,
  removeAt,
  setQueue,
  shouldFetchRecommendations,
  shuffleRest,
} from '../../src/services/audio/queue';
import type { Track } from '../../src/types';

const track = (id: string): Track => ({
  id,
  source: 'youtube',
  sourceId: id,
  title: id,
  artist: '',
  album: null,
  durationSec: null,
  artworkUrl: '',
});

const items = ['a', 'b', 'c'].map(track);

test('setQueue clamps the start index into range', () => {
  assert.deepEqual(setQueue(items, 99).index, 2);
  assert.deepEqual(setQueue(items, -5).index, 0);
  assert.equal(setQueue([]).index, -1);
});

test('setQueue copies the array instead of aliasing it', () => {
  const q = setQueue(items);
  q.items.push(track('d'));
  assert.equal(items.length, 3);
});

test('playNext inserts right after the current track', () => {
  const q = playNext({ items, index: 1 }, track('x'));
  assert.deepEqual(q.items.map((t) => t.id), ['a', 'b', 'x', 'c']);
  assert.equal(q.index, 1);
});

test('playNext on an empty queue starts a new one', () => {
  const q = playNext(emptyQueue, track('x'));
  assert.deepEqual(q.items.map((t) => t.id), ['x']);
  assert.equal(q.index, 0);
});

test('enqueue appends and keeps the current index', () => {
  const q = enqueue({ items, index: 2 }, [track('d')]);
  assert.deepEqual(q.items.map((t) => t.id), ['a', 'b', 'c', 'd']);
  assert.equal(q.index, 2);
});

test('removeAt shifts the index when removing before the current track', () => {
  const q = removeAt({ items, index: 2 }, 0);
  assert.deepEqual(q.items.map((t) => t.id), ['b', 'c']);
  assert.equal(q.index, 1);
});

test('removeAt keeps the index in range when removing the current track', () => {
  const q = removeAt({ items, index: 2 }, 2);
  assert.deepEqual(q.items.map((t) => t.id), ['a', 'b']);
  assert.equal(q.index, 1);
});

test('removeAt ignores out-of-range indexes and empties to emptyQueue', () => {
  assert.equal(removeAt({ items, index: 1 }, 9).index, 1);
  assert.deepEqual(removeAt({ items: [track('a')], index: 0 }, 0), emptyQueue);
});

test('nextIndex honours repeat modes', () => {
  assert.equal(nextIndex({ items, index: 0 }, 'off', false), 1);
  assert.equal(nextIndex({ items, index: 2 }, 'off', false), null);
  assert.equal(nextIndex({ items, index: 2 }, 'all', false), 0);
  assert.equal(nextIndex({ items, index: 1 }, 'one', false), 1);
  // "próxima" manual ignora repeat one
  assert.equal(nextIndex({ items, index: 1 }, 'one', true), 2);
  assert.equal(nextIndex({ items, index: 2 }, 'one', true), 2);
  assert.equal(nextIndex({ items: [track('solo')], index: 0 }, 'one', true), 0);
  assert.equal(nextIndex(emptyQueue, 'all', true), null);
});

test('recommendations are fetched only when an online queue ends without repeat', () => {
  assert.equal(shouldFetchRecommendations({ items, index: 2 }, 'off'), true);
  assert.equal(shouldFetchRecommendations({ items, index: 1 }, 'off'), false);
  assert.equal(shouldFetchRecommendations({ items, index: 2 }, 'all'), false);
  assert.equal(shouldFetchRecommendations({ items: [{ ...track('local'), source: 'local' }], index: 0 }, 'off'), false);
  assert.equal(shouldFetchRecommendations(emptyQueue, 'off'), false);
});

test('prevIndex honours repeat all', () => {
  assert.equal(prevIndex({ items, index: 1 }, 'off'), 0);
  assert.equal(prevIndex({ items, index: 0 }, 'off'), null);
  assert.equal(prevIndex({ items, index: 0 }, 'all'), 2);
});

test('reverse repeat plays toward the start and wraps to the end', () => {
  assert.equal(nextIndex({ items, index: 2 }, 'reverse', false), 1);
  assert.equal(nextIndex({ items, index: 0 }, 'reverse', false), 2);
  assert.equal(nextIndex({ items, index: 1 }, 'reverse', true), 0);
  assert.equal(prevIndex({ items, index: 1 }, 'reverse'), 2);
  assert.equal(prevIndex({ items, index: 2 }, 'reverse'), 0);
});

test('shuffleRest keeps the played head and only permutes the tail', () => {
  const q = shuffleRest({ items, index: 1 }, () => 0);
  assert.deepEqual(q.items.slice(0, 2).map((t) => t.id), ['a', 'b']);
  assert.equal(q.index, 1);
  assert.deepEqual([...q.items.slice(2).map((t) => t.id)].sort(), ['c']);
});

test('shuffleRest is a no-op on an empty queue', () => {
  assert.equal(shuffleRest(emptyQueue), emptyQueue);
});

test('appendRecommended marks where the recommendations start', () => {
  const q = appendRecommended({ items, index: 1 }, [track('r1'), track('r2')]);
  assert.deepEqual(q.items.map((t) => t.id), ['a', 'b', 'c', 'r1', 'r2']);
  assert.equal(q.recStart, 3);
  const more = appendRecommended(q, [track('r3')]);
  assert.equal(more.recStart, 3);
});

test('removeAt and playNext keep recStart pointing at the first recommendation', () => {
  const q = { items: [...items, track('r1')], index: 0, recStart: 3 };
  assert.equal(removeAt(q, 0).recStart, 2);
  assert.equal(removeAt(q, 3).recStart, undefined);
  assert.equal(playNext(q, track('x')).recStart, 4);
  assert.equal(playNext({ ...q, index: 3 }, track('x')).recStart, 3);
});

test('repeat all loops the playlist and skips recommendations', () => {
  const q = { items: [...items, track('r1')], index: 2, recStart: 3 };
  assert.equal(nextIndex(q, 'all', false), 0);
  assert.equal(nextIndex({ ...q, index: 3 }, 'all', false), 0);
  assert.equal(nextIndex({ ...q, index: 3 }, 'off', false), null);
  assert.equal(prevIndex({ ...q, index: 0 }, 'all'), 2);
});

test('reverse repeat stays inside the playlist when recommendations are queued', () => {
  const q = { items: [...items, track('r1')], index: 0, recStart: 3 };
  assert.equal(nextIndex(q, 'reverse', false), 2);
  assert.equal(nextIndex({ ...q, index: 3 }, 'reverse', false), 2);
  assert.equal(prevIndex({ ...q, index: 2 }, 'reverse'), 0);
});

test('dropRecommended removes only unplayed recommendations', () => {
  const q = { items: [...items, track('r1')], index: 1, recStart: 3 };
  assert.deepEqual(dropRecommended(q), { items: items.slice(), index: 1 });
  const onRec = { ...q, index: 3 };
  assert.equal(dropRecommended(onRec), onRec);
});

test('shuffleRest does not mix recommendations into the playlist', () => {
  const q = shuffleRest({ items: [...items, track('r1'), track('r2')], index: 0, recStart: 3 }, () => 0.5);
  assert.equal(q.items[0].id, 'a');
  assert.deepEqual(q.items.slice(1, 3).map((t) => t.id).sort(), ['b', 'c']);
  assert.deepEqual(q.items.slice(3).map((t) => t.id), ['r1', 'r2']);
});
