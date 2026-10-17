import test from 'node:test';
import assert from 'node:assert/strict';
import { ImportError, parsePlaylistLink } from '../../src/features/playlists/importPlaylistHelpers';

const ID = 'PLabcdefghijk1234567890';

test('aceita links https de playlist do YouTube e do YouTube Music', () => {
  for (const host of ['music.youtube.com', 'www.youtube.com', 'youtube.com', 'm.youtube.com']) {
    const r = parsePlaylistLink(`https://${host}/playlist?list=${ID}`);
    assert.equal(r.playlistId, ID);
    assert.equal(r.canonicalUrl, `https://music.youtube.com/playlist?list=${ID}`);
  }
  assert.equal(parsePlaylistLink(`  https://www.youtube.com/watch?v=abc&list=${ID} `).playlistId, ID);
});

test('rejeita links inválidos com ImportError(invalidLink)', () => {
  const bad = [
    '', 'não é url', `http://music.youtube.com/playlist?list=${ID}`,
    `https://evil.example.com/playlist?list=${ID}`,
    `https://youtube.com.evil.com/playlist?list=${ID}`,
    `https://music.youtube.com/channel?list=${ID}`,
    'https://music.youtube.com/playlist', 'https://music.youtube.com/playlist?list=curto',
    `https://music.youtube.com/playlist?list=${ID}%0A;rm`,
  ];
  for (const link of bad) {
    assert.throws(() => parsePlaylistLink(link), (e: unknown) => e instanceof ImportError && e.code === 'invalidLink', link);
  }
});
