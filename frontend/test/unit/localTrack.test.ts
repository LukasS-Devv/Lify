import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalTrack } from '../../src/utils/localTrack';

test('createLocalTrack stores a private local URI and derives a title from its filename', () => {
  assert.deepEqual(createLocalTrack('copy-id', 'file:///app/audio/copy-id.mp3', 'C:\\Music\\My song.mp3'), {
    id: 'local:copy-id',
    source: 'local',
    sourceId: 'file:///app/audio/copy-id.mp3',
    title: 'My song',
    artist: '',
    album: null,
    durationSec: null,
    artworkUrl: '',
  });
});
