import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaylistLink } from '../../src/features/playlists/importPlaylistHelpers';

test('playlist import parses only supported public playlist URLs', () => {
  assert.deepEqual(
    parsePlaylistLink('https://music.youtube.com/playlist?list=PL1234567890&si=abc'),
    {
      playlistId: 'PL1234567890',
      canonicalUrl: 'https://music.youtube.com/playlist?list=PL1234567890',
    },
  );
});

test('playlist import rejects unsafe hosts and malformed links', () => {
  for (const url of [
    'http://music.youtube.com/playlist?list=PL1234567890',
    'https://music.youtube.com.evil/playlist?list=PL1234567890',
    'https://open.spotify.com/playlist/1234567890123456789012',
    'https://music.youtube.com/playlist?list=short',
    'https://example.com/playlist?list=PL1234567890',
  ]) {
    assert.throws(() => parsePlaylistLink(url), { message: 'import.invalidLink' });
  }
});
