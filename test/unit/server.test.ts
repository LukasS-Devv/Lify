import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppSettings } from '../../src/types';
import { getStreamServerUrl, normalizeStreamServerUrl } from '../../src/services/catalog/server';

const settings: AppSettings = {
  repeatMode: 'off',
  autoQueue: true,
  historyEnabled: true,
  streamServerMode: 'custom',
  customStreamServerUrl: ' https://audio.example.com/ ',
};

test('normalizes a valid base URL', () => {
  assert.equal(normalizeStreamServerUrl(' https://audio.example.com/ '), 'https://audio.example.com');
});

test('rejects custom URLs that are not server base URLs', () => {
  assert.throws(() => normalizeStreamServerUrl('audio.example.com'), /Inclua http:\/\/ ou https:\/\//);
  assert.throws(() => normalizeStreamServerUrl('https://audio.example.com/stream'), /sem caminho adicional/);
  assert.throws(() => normalizeStreamServerUrl('https://user:pass@audio.example.com'), /sem credenciais ou parâmetros/);
});

test('uses the selected custom URL as the stream server base', () => {
  assert.equal(getStreamServerUrl(settings), 'https://audio.example.com');
});
