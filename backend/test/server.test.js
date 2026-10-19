'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const test = require('node:test');
const { app, createApp } = require('../index');

async function startTestServer(t) {
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

test('health endpoint reports the server status', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('stream endpoint rejects IDs that are not YouTube video IDs', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/stream/not-a-video-id`);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_video_id' });
});

test('stream endpoint rejects unsupported playback profiles', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/stream/abcdefghijk?profile=unsupported`);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_playback_profile' });
});

test('Spotify import endpoint is no longer available', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/import/spotify/1234567890123456789012`);
  assert.equal(response.status, 404);
});

test('a yt-dlp failure returns 502 without taking down the server', async (t) => {
  const spawnProcess = () => {
    const process = new EventEmitter();
    process.exitCode = null;
    process.signalCode = null;
    process.stdout = new PassThrough();
    process.stderr = new PassThrough();
    process.kill = (signal) => {
      process.signalCode = signal;
      setImmediate(() => process.emit('close', null));
      return true;
    };

    setImmediate(() => {
      process.stderr.end('ERROR: HTTP Error 403: Forbidden\n');
      process.stdout.end();
      process.exitCode = 1;
      process.emit('close', 1);
    });
    return process;
  };
  const server = createApp({ spawnProcess, downloaderPath: 'yt-dlp-test' }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const streamResponse = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(streamResponse.status, 502);
  assert.deepEqual(await streamResponse.json(), { error: 'stream_unavailable' });

  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.equal(healthResponse.status, 200);
});

test('stream endpoint forwards byte-range requests to the seekable audio source', async (t) => {
  const expectedUrl = 'https://r1---sn.googlevideo.com/videoplayback?signature=abc';
  let requestedUrl;
  let requestedHeaders;
  let extractorArgs;
  const testSpawn = (_path, args) => {
    extractorArgs = args;
    const process = new EventEmitter();
    process.exitCode = null;
    process.signalCode = null;
    process.stdout = new PassThrough();
    process.stderr = new PassThrough();
    process.kill = () => true;

    setImmediate(() => {
      process.stdout.end(JSON.stringify({
        url: expectedUrl,
        http_headers: { 'User-Agent': 'yt-dlp-test' },
      }));
      process.exitCode = 0;
      process.emit('close', 0);
    });
    return process;
  };
  const requestUpstream = (url, options, onResponse) => {
    requestedUrl = url.toString();
    requestedHeaders = options.headers;
    const request = new EventEmitter();
    request.end = () => setImmediate(() => {
      const response = new PassThrough();
      response.statusCode = 206;
      response.headers = {
        'accept-ranges': 'bytes',
        'content-range': 'bytes 10-19/100',
        'content-length': '10',
        'content-type': 'audio/mp4',
      };
      onResponse(response);
      response.end('audio-data');
    });
    request.destroy = () => {};
    return request;
  };
  const server = createApp({ spawnProcess: testSpawn, requestUpstream, downloaderPath: 'yt-dlp-test' }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/stream/abcdefghijk`, {
    headers: { Range: 'bytes=10-19' },
  });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.equal(response.headers.get('content-range'), 'bytes 10-19/100');
  assert.equal(response.headers.get('cache-control'), 'no-store, no-transform');
  assert.equal(await response.text(), 'audio-data');
  assert.equal(requestedUrl, expectedUrl);
  assert.deepEqual(requestedHeaders, { 'User-Agent': 'yt-dlp-test', Range: 'bytes=10-19' });
  assert.ok(extractorArgs.includes('bestaudio[abr<=128]/bestaudio[abr<=160]/bestaudio'));
});

test('data saver profile selects a lower-bitrate format', async (t) => {
  const expectedUrl = 'https://r1---sn.googlevideo.com/videoplayback?signature=abc';
  let selectedFormat;
  const spawnProcess = (_path, args) => {
    selectedFormat = args[args.indexOf('--format') + 1];
    const process = new EventEmitter();
    process.exitCode = null;
    process.signalCode = null;
    process.stdout = new PassThrough();
    process.stderr = new PassThrough();
    process.kill = () => true;

    setImmediate(() => {
      process.stdout.end(JSON.stringify({ url: expectedUrl }));
      process.exitCode = 0;
      process.emit('close', 0);
    });
    return process;
  };
  const requestUpstream = (_url, _options, onResponse) => {
    const request = new EventEmitter();
    request.end = () => setImmediate(() => {
      const response = new PassThrough();
      response.statusCode = 200;
      response.headers = {};
      onResponse(response);
      response.end('audio-data');
    });
    request.destroy = () => {};
    return request;
  };
  const server = createApp({ spawnProcess, requestUpstream, downloaderPath: 'yt-dlp-test' }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/stream/abcdefghijk?profile=dataSaver`);
  assert.equal(response.status, 200);
  assert.equal(selectedFormat, 'bestaudio[abr<=64]/bestaudio[abr<=96]/worstaudio');
  await response.arrayBuffer();
});

test('stream resolution is shared concurrently and cached until the source URL expires', async (t) => {
  const expectedUrl = `https://r1---sn.googlevideo.com/videoplayback?expire=${Math.floor(Date.now() / 1000) + 600}`;
  let spawnCount = 0;
  const spawnProcess = (_path, _args) => {
    spawnCount += 1;
    const process = new EventEmitter();
    process.exitCode = null;
    process.signalCode = null;
    process.stdout = new PassThrough();
    process.stderr = new PassThrough();
    process.kill = () => true;
    setImmediate(() => {
      process.stdout.end(JSON.stringify({ url: expectedUrl }));
      process.exitCode = 0;
      process.emit('close', 0);
    });
    return process;
  };
  const requestUpstream = (_url, _options, onResponse) => {
    const request = new EventEmitter();
    request.end = () => setImmediate(() => {
      const response = new PassThrough();
      response.statusCode = 200;
      response.headers = {};
      onResponse(response);
      response.end('audio-data');
    });
    request.destroy = () => {};
    return request;
  };
  const server = createApp({ spawnProcess, requestUpstream, downloaderPath: 'yt-dlp-test' }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/stream/abcdefghijk`;

  const firstPair = await Promise.all([fetch(url), fetch(url)]);
  assert.deepEqual(firstPair.map((response) => response.status), [200, 200]);
  await Promise.all(firstPair.map((response) => response.arrayBuffer()));
  const cachedResponse = await fetch(url);
  assert.equal(cachedResponse.status, 200);
  await cachedResponse.arrayBuffer();
  assert.equal(spawnCount, 1);
});

test('prefetch endpoint warms the resolution cache used by the stream endpoint', async (t) => {
  const expectedUrl = `https://r1---sn.googlevideo.com/videoplayback?expire=${Math.floor(Date.now() / 1000) + 600}`;
  let spawnCount = 0;
  const spawnProcess = () => {
    spawnCount += 1;
    const process = new EventEmitter();
    process.exitCode = null;
    process.signalCode = null;
    process.stdout = new PassThrough();
    process.stderr = new PassThrough();
    process.kill = () => true;
    setImmediate(() => {
      process.stdout.end(JSON.stringify({ url: expectedUrl }));
      process.exitCode = 0;
      process.emit('close', 0);
    });
    return process;
  };
  const requestUpstream = (_url, _options, onResponse) => {
    const request = new EventEmitter();
    request.end = () => setImmediate(() => {
      const response = new PassThrough();
      response.statusCode = 200;
      response.headers = {};
      onResponse(response);
      response.end('audio-data');
    });
    request.destroy = () => {};
    return request;
  };
  const server = createApp({ spawnProcess, requestUpstream, downloaderPath: 'yt-dlp-test' }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const prefetchResponse = await fetch(`${baseUrl}/prefetch/abcdefghijk?profile=dataSaver`);
  assert.equal(prefetchResponse.status, 202);
  assert.deepEqual(await prefetchResponse.json(), { status: 'miss' });

  await new Promise((resolve) => setTimeout(resolve, 20));
  const streamResponse = await fetch(`${baseUrl}/stream/abcdefghijk?profile=dataSaver`);
  assert.equal(streamResponse.status, 200);
  await streamResponse.arrayBuffer();
  assert.equal(spawnCount, 1);

  const invalidResponse = await fetch(`${baseUrl}/prefetch/not-a-video-id`);
  assert.equal(invalidResponse.status, 400);
});

test('stream endpoint returns 503 when the resolver capacity is exhausted', async (t) => {
  let blockedProcess;
  const spawnProcess = () => {
    const process = new EventEmitter();
    process.exitCode = null;
    process.signalCode = null;
    process.stdout = new PassThrough();
    process.stderr = new PassThrough();
    process.kill = () => true;
    blockedProcess = process;
    return process;
  };
  const server = createApp({
    spawnProcess,
    downloaderPath: 'yt-dlp-test',
    maxConcurrentResolvers: 1,
    extractorTimeoutMs: 5000,
  }).listen(0, '127.0.0.1');
  t.after(() => {
    if (blockedProcess) {
      blockedProcess.exitCode = 1;
      blockedProcess.emit('close', 1);
    }
    return new Promise((resolve) => server.close(resolve));
  });
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const pending = fetch(`${baseUrl}/stream/abcdefghijk`);
  await new Promise((resolve) => setImmediate(resolve));

  const limited = await fetch(`${baseUrl}/stream/lmnopqrstuv`);
  assert.equal(limited.status, 503);
  assert.equal(limited.headers.get('retry-after'), '2');
  assert.deepEqual(await limited.json(), { error: 'server_busy' });

  blockedProcess.exitCode = 1;
  blockedProcess.emit('close', 1);
  assert.equal((await pending).status, 502);
});

test('stream endpoint times out yt-dlp resolution', async (t) => {
  const spawnProcess = () => {
    const process = new EventEmitter();
    process.exitCode = null;
    process.signalCode = null;
    process.stdout = new PassThrough();
    process.stderr = new PassThrough();
    process.kill = (signal) => {
      process.signalCode = signal;
      return true;
    };
    return process;
  };
  const server = createApp({
    spawnProcess,
    downloaderPath: 'yt-dlp-test',
    extractorTimeoutMs: 20,
  }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/stream/abcdefghijk`);
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), { error: 'stream_timeout' });
});

test('stream endpoint follows googlevideo redirects instead of forwarding them', async (t) => {
  const first = 'https://r1---sn.googlevideo.com/videoplayback?signature=abc';
  const second = 'https://r2---sn.googlevideo.com/videoplayback?signature=abc&rr=1';
  const requested = [];
  const spawnProcess = () => {
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.exitCode = null;
    child.signalCode = null;
    child.kill = () => {};
    setImmediate(() => {
      child.stdout.end(JSON.stringify({ url: first, http_headers: {} }));
      child.exitCode = 0;
      child.emit('close', 0);
    });
    return child;
  };
  const requestUpstream = (url, _options, onResponse) => {
    requested.push(url.toString());
    const request = new EventEmitter();
    request.end = () => setImmediate(() => {
      const response = new PassThrough();
      if (requested.length === 1) {
        response.statusCode = 302;
        response.headers = { location: second };
        onResponse(response);
        response.end();
      } else {
        response.statusCode = 200;
        response.headers = { 'content-type': 'audio/mp4' };
        onResponse(response);
        response.end('audio-data');
      }
    });
    request.destroy = () => {};
    return request;
  };
  const server = createApp({ spawnProcess, requestUpstream, downloaderPath: 'yt-dlp-test' }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/stream/abcdefghijk`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'audio-data');
  assert.deepEqual(requested, [first, second]);
});