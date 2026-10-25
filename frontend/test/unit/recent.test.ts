import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecentEntries, interleaveUnique, uniqueRecentTracks } from '../../src/utils/recent';
import type { HistoryEntry, PlaylistSummary, Track } from '../../src/types';

const track = (id: string): Track => ({
  id,
  source: 'youtube',
  sourceId: id,
  title: `Track ${id}`,
  artist: 'Artist',
  album: null,
  durationSec: 100,
  artworkUrl: '',
} as unknown as Track);

const entry = (id: string, playedAt = 0): HistoryEntry => ({ track: track(id), playedAt });

const playlist = (id: number): PlaylistSummary => ({
  id,
  name: `Playlist ${id}`,
  trackCount: 3,
  coverUrl: null,
} as unknown as PlaylistSummary);

test('uniqueRecentTracks keeps the newest occurrence of each track', () => {
  const history = [
    { track: track('a'), playedAt: 300 },
    { track: track('b'), playedAt: 200 },
    { track: track('a'), playedAt: 100 },
  ];
  assert.deepEqual(uniqueRecentTracks(history).map((item) => item.id), ['a', 'b']);
});

test('buildRecentEntries collapses repeated plays of the same track', () => {
  const history = [entry('a'), entry('a'), entry('a'), entry('b')];
  const entries = buildRecentEntries(history, new Map(), new Map());
  assert.deepEqual(entries.map((e) => e.key), ['track-a', 'track-b']);
  assert.equal(entries[0].kind === 'track' && entries[0].queueIndex, 0);
});

test('buildRecentEntries replaces tracks that belong to a playlist with the playlist', () => {
  const history = [entry('a'), entry('x'), entry('b'), entry('x')];
  const entries = buildRecentEntries(
    history,
    new Map([['x', 7], ['a', 7]]),
    new Map([[7, playlist(7)]]),
  );
  assert.deepEqual(entries.map((e) => e.key), ['playlist-7', 'track-b']);
});

test('buildRecentEntries keeps the track when its playlist is unknown', () => {
  const entries = buildRecentEntries([entry('a')], new Map([['a', 99]]), new Map());
  assert.deepEqual(entries.map((e) => e.key), ['track-a']);
});

test('interleaveUnique mixes lists round by round and respects the limit', () => {
  const result = interleaveUnique([['t1', 't2', 't3', 't4'], ['p1'], ['a1', 'a2']], 6, (item) => item);
  assert.deepEqual(result, ['t1', 'p1', 'a1', 't2', 'a2', 't3']);
});

test('interleaveUnique skips duplicate keys across lists', () => {
  const result = interleaveUnique([['x', 'y'], ['x', 'z']], 8, (item) => item);
  assert.deepEqual(result, ['x', 'z', 'y']);
});
