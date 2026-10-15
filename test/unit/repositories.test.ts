import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryDb, T } from './helpers';
import * as playlists from '../../src/database/repositories/playlists';
import * as favorites from '../../src/database/repositories/favorites';
import * as history from '../../src/database/repositories/history';
import * as settings from '../../src/database/repositories/settings';
import { copyAllData } from '../../src/storage/backups/copyData';
import { DEFAULT_SETTINGS } from '../../src/types';

test('playlist: criar, adicionar sem duplicar, ordenar, remover', async () => {
  const db = memoryDb();
  await assert.rejects(playlists.createPlaylist(db, '   '));
  const id = await playlists.createPlaylist(db, ' Mix ');
  assert.equal(await playlists.addTrackToPlaylist(db, id, T('a')), true);
  assert.equal(await playlists.addTrackToPlaylist(db, id, T('a')), false);
  await playlists.addTrackToPlaylist(db, id, T('b'));
  await playlists.addTrackToPlaylist(db, id, T('c'));
  assert.deepEqual((await playlists.getPlaylistTracks(db, id)).map((t) => t.sourceId), ['a', 'b', 'c']);

  await playlists.moveTrackInPlaylist(db, id, 2, 0);
  assert.deepEqual((await playlists.getPlaylistTracks(db, id)).map((t) => t.sourceId), ['c', 'a', 'b']);

  await playlists.removeTrackFromPlaylist(db, id, 'youtube:a');
  assert.deepEqual((await playlists.getPlaylistTracks(db, id)).map((t) => t.sourceId), ['c', 'b']);
  // posições recompactadas: novo item vai para o fim
  await playlists.addTrackToPlaylist(db, id, T('d'));
  assert.deepEqual((await playlists.getPlaylistTracks(db, id)).map((t) => t.sourceId), ['c', 'b', 'd']);

  const [sum] = await playlists.listPlaylists(db);
  assert.equal(sum.name, 'Mix');
  assert.equal(sum.trackCount, 3);
  assert.match(sum.coverUrl ?? '', /\/c\//);

  await playlists.deletePlaylist(db, id);
  assert.equal((await playlists.listPlaylists(db)).length, 0);
  assert.equal((await playlists.getPlaylistTracks(db, id)).length, 0);
});

test('favoritos: toggle', async () => {
  const db = memoryDb();
  assert.equal(await favorites.toggleFavorite(db, T('x')), true);
  assert.equal(await favorites.isFavorite(db, 'youtube:x'), true);
  assert.equal((await favorites.listFavorites(db)).length, 1);
  assert.equal(await favorites.toggleFavorite(db, T('x')), false);
  assert.equal((await favorites.listFavorites(db)).length, 0);
});

test('histórico: ordem, dedupe consecutivo e limpar', async () => {
  const db = memoryDb();
  await history.recordPlay(db, T('a'), 1);
  await history.recordPlay(db, T('b'), 2);
  await history.recordPlay(db, T('b'), 3); // repetida em sequência → atualiza
  await history.recordPlay(db, T('a'), 4);
  const h = await history.listHistory(db);
  assert.deepEqual(h.map((e) => e.track.sourceId), ['a', 'b', 'a']);
  await history.clearHistory(db);
  assert.equal((await history.listHistory(db)).length, 0);
});

test('settings: defaults, persistência e valor corrompido', async () => {
  const db = memoryDb();
  assert.deepEqual(await settings.loadSettings(db), DEFAULT_SETTINGS);
  await settings.saveSetting(db, 'repeatMode', 'all');
  await settings.saveSetting(db, 'autoQueue', false);
  await db.runAsync("INSERT INTO settings (key, value) VALUES ('historyEnabled', '{oops')");
  const s = await settings.loadSettings(db);
  assert.equal(s.repeatMode, 'all');
  assert.equal(s.autoQueue, false);
  assert.equal(s.historyEnabled, true);
});

test('backup: copyAllData substitui o destino e preserva relações', async () => {
  const src = memoryDb();
  const id = await playlists.createPlaylist(src, 'Origem');
  await playlists.addTrackToPlaylist(src, id, T('s1'));
  await favorites.toggleFavorite(src, T('s1'));
  await history.recordPlay(src, T('s1'), 10);
  await settings.saveSetting(src, 'repeatMode', 'one');

  const dst = memoryDb();
  const old = await playlists.createPlaylist(dst, 'Antiga');
  await playlists.addTrackToPlaylist(dst, old, T('old'));

  await copyAllData(src, dst);
  const lists = await playlists.listPlaylists(dst);
  assert.deepEqual(lists.map((l) => [l.name, l.trackCount]), [['Origem', 1]]);
  assert.equal((await favorites.listFavorites(dst)).length, 1);
  assert.equal((await history.listHistory(dst)).length, 1);
  assert.equal((await settings.loadSettings(dst)).repeatMode, 'one');
  assert.equal((await dst.getAllAsync('SELECT * FROM tracks')).length, 1);
});
