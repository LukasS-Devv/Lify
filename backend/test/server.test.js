'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { EventEmitter } = require('node:events');
const path = require('node:path');
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

test('browser clients can access the API and read audio response headers', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://lify.example' },
  });
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(response.headers.get('access-control-expose-headers'), /Content-Range/i);
});

test('CORS preflight permits browser audio range requests', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/stream/abcdefghijk`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://lify.example',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Range',
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(response.headers.get('access-control-allow-methods'), /GET/);
  assert.match(response.headers.get('access-control-allow-headers'), /Range/i);
});

test('CORS can be restricted to configured browser origins', async (t) => {
  const baseUrl = await startAppServer(t, { corsOrigins: 'https://lify.example, https://preview.lify.example' });
  const allowed = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://lify.example' },
  });
  const blocked = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://other.example' },
  });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://lify.example');
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});

test('catalog endpoints proxy browser search, suggestions, artists, collections, and related tracks', async (t) => {
  const catalogClient = async () => ({
    music: {
      search: async (_query, { type }) => type === 'artist'
        ? { artists: { contents: [{ id: 'UC123', title: 'Artist' }] } }
        : { songs: { contents: [{ video_id: 'abcdefghijk', title: 'Song' }] } },
      getSearchSuggestions: async () => [{ contents: [{ suggestion: 'Suggested song' }] }],
      getArtist: async () => ({
        header: { title: 'Artist' },
        sections: [],
        getAllSongs: async () => ({ contents: [{ video_id: 'abcdefghijk', title: 'Song' }] }),
      }),
      getAlbum: async () => ({
        header: { title: 'Album' },
        contents: [{ video_id: 'abcdefghijk', title: 'Song' }],
        has_continuation: false,
      }),
      getPlaylist: async () => ({
        header: { title: 'Playlist' },
        items: [{ video_id: 'abcdefghijk', title: 'Song' }],
        has_continuation: false,
      }),
      getUpNext: async () => ({ contents: [{ video_id: 'lmnopqrstuv', title: 'Related' }] }),
    },
  });
  const baseUrl = await startAppServer(t, { catalogClient });
  const getJson = async (path) => {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Origin: 'https://lify.example' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    return response.json();
  };

  assert.equal((await getJson('/catalog/search?q=Song&type=song'))[0].video_id, 'abcdefghijk');
  assert.equal((await getJson('/catalog/search?q=Artist&type=artist'))[0].id, 'UC123');
  assert.equal((await getJson('/catalog/suggestions?q=Song'))[0].contents[0].suggestion, 'Suggested song');
  assert.equal((await getJson('/catalog/artist/UC123')).allSongs[0].video_id, 'abcdefghijk');
  assert.equal((await getJson('/catalog/collection/album/MPRE123')).contents[0].video_id, 'abcdefghijk');
  assert.equal((await getJson('/catalog/collection/playlist/PL123')).items[0].video_id, 'abcdefghijk');
  assert.equal((await getJson('/catalog/related/abcdefghijk'))[0].video_id, 'lmnopqrstuv');
});

test('catalog routes reject invalid query types and IDs', async (t) => {
  const baseUrl = await startTestServer(t);
  const invalidType = await fetch(`${baseUrl}/catalog/search?q=Song&type=video`);
  assert.equal(invalidType.status, 400);
  assert.deepEqual(await invalidType.json(), { error: 'invalid_catalog_type' });
  const invalidId = await fetch(`${baseUrl}/catalog/related/invalid`);
  assert.equal(invalidId.status, 400);
  assert.deepEqual(await invalidId.json(), { error: 'invalid_video_id' });
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

test('direct download uses yt-dlp while stream keeps the Innertube resolver', async (t) => {
  let downloadArgs;
  let innertubeCalls = 0;
  let temporaryOutputDirectory;
  const spawnProcess = (_path, args) => {
    downloadArgs = args;
    const process = new EventEmitter();
    process.exitCode = null;
    process.signalCode = null;
    process.stderr = new PassThrough();
    process.kill = () => true;
    const outputTemplate = args[args.indexOf('--output') + 1];
    temporaryOutputDirectory = path.dirname(outputTemplate);
    const outputPath = outputTemplate.replace('%(id)s.%(ext)s', 'abcdefghijk.m4a');

    setImmediate(() => {
      fs.writeFileSync(outputPath, 'downloaded-audio');
      process.stderr.end();
      process.exitCode = 0;
      process.emit('close', 0);
    });
    return process;
  };
  const innertubeResolver = async () => {
    innertubeCalls += 1;
    return {
      url: 'https://r1---sn.googlevideo.com/videoplayback?signature=stream',
      httpHeaders: {},
      resolveMs: 1,
      resolver: 'innertube',
    };
  };
  const requestUpstream = (_url, _options, onResponse) => {
    const request = new EventEmitter();
    request.end = () => setImmediate(() => {
      const response = new PassThrough();
      response.statusCode = 200;
      response.headers = { 'content-type': 'audio/mp4' };
      onResponse(response);
      response.end('stream-audio');
    });
    request.destroy = () => {};
    return request;
  };
  const baseUrl = await startAppServer(t, {
    spawnProcess,
    requestUpstream,
    downloaderPath: 'yt-dlp-test',
    innertubeResolver,
  });

  const download = await fetch(`${baseUrl}/download/abcdefghijk?profile=dataSaver`);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('content-type'), 'audio/mp4');
  assert.match(download.headers.get('content-disposition'), /attachment; filename="abcdefghijk\.m4a"/);
  assert.equal(await download.text(), 'downloaded-audio');
  assert.ok(downloadArgs.includes('--format'));
  assert.equal(downloadArgs[downloadArgs.indexOf('--format') + 1], 'bestaudio[abr<=64]/bestaudio[abr<=96]/worstaudio');
  assert.equal(downloadArgs[downloadArgs.indexOf('--output') + 1], path.join(temporaryOutputDirectory, '%(id)s.%(ext)s'));
  assert.ok(downloadArgs.includes('--no-part'));
  assert.equal(innertubeCalls, 0);
  for (let attempt = 0; attempt < 100 && fs.existsSync(temporaryOutputDirectory); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(fs.existsSync(temporaryOutputDirectory), false);

  const stream = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(stream.status, 200);
  assert.equal(await stream.text(), 'stream-audio');
  assert.equal(innertubeCalls, 1);
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
  const server = createApp({ spawnProcess, downloaderPath: 'yt-dlp-test', innertubeResolver: null }).listen(0, '127.0.0.1');
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
  const server = createApp({ spawnProcess: testSpawn, requestUpstream, downloaderPath: 'yt-dlp-test', innertubeResolver: null }).listen(0, '127.0.0.1');
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
  const server = createApp({ spawnProcess, requestUpstream, downloaderPath: 'yt-dlp-test', innertubeResolver: null }).listen(0, '127.0.0.1');
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
  const server = createApp({ spawnProcess, requestUpstream, downloaderPath: 'yt-dlp-test', innertubeResolver: null }).listen(0, '127.0.0.1');
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
  const server = createApp({ spawnProcess, requestUpstream, downloaderPath: 'yt-dlp-test', innertubeResolver: null }).listen(0, '127.0.0.1');
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
    innertubeResolver: null,
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
    innertubeResolver: null,
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
  const server = createApp({ spawnProcess, requestUpstream, downloaderPath: 'yt-dlp-test', innertubeResolver: null }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/stream/abcdefghijk`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'audio-data');
  assert.deepEqual(requested, [first, second]);
});

test('without a client Range the upstream gets bytes=0- and the client receives a plain 200', async (t) => {
  const expectedUrl = 'https://r1---sn.googlevideo.com/videoplayback?signature=range0';
  const upstreamCalls = [];
  const requestUpstream = (url, options, onResponse) => {
    upstreamCalls.push({ url: url.toString(), headers: options.headers });
    const request = new EventEmitter();
    request.end = () => setImmediate(() => {
      const response = new PassThrough();
      response.statusCode = 206;
      response.headers = {
        'accept-ranges': 'bytes',
        'content-range': 'bytes 0-9/100',
        'content-length': '10',
        'content-type': 'audio/mp4',
      };
      onResponse(response);
      response.end('audio-data');
    });
    request.destroy = () => {};
    return request;
  };
  const baseUrl = await startAppServer(t, {
    innertubeResolver: null,
    spawnProcess: createSpawnProcess({ stdout: JSON.stringify({ url: expectedUrl, http_headers: {} }) }),
    requestUpstream,
    downloaderPath: 'yt-dlp-test',
  });

  const response = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-range'), null);
  assert.equal(response.headers.get('content-length'), '10');
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.equal(await response.text(), 'audio-data');
  assert.equal(upstreamCalls.length, 1);
  assert.equal(upstreamCalls[0].headers.Range, 'bytes=0-');
});

test('an upstream 403 on an Innertube URL retries once through yt-dlp and caches the result', async (t) => {
  const future = Math.floor(Date.now() / 1000) + 600;
  const innertubeUrl = `https://r1---sn.googlevideo.com/videoplayback?signature=inn403&expire=${future}`;
  const ytdlpUrl = `https://r1---sn.googlevideo.com/videoplayback?signature=ytd403&expire=${future}`;
  const upstreamCalls = [];
  let innertubeCalls = 0;
  let spawnCount = 0;
  const requestUpstream = (url, options, onResponse) => {
    upstreamCalls.push({ url: url.toString(), headers: options.headers });
    const request = new EventEmitter();
    request.end = () => setImmediate(() => {
      const response = new PassThrough();
      if (url.toString() === innertubeUrl) {
        response.statusCode = 403;
        response.headers = {};
        onResponse(response);
        response.end();
      } else {
        response.statusCode = 200;
        response.headers = {};
        onResponse(response);
        response.end('audio-data');
      }
    });
    request.destroy = () => {};
    return request;
  };
  const baseUrl = await startAppServer(t, {
    innertubeResolver: async () => {
      innertubeCalls += 1;
      return { url: innertubeUrl, httpHeaders: { 'User-Agent': 'innertube-test' }, resolveMs: 1, resolver: 'innertube' };
    },
    spawnProcess: createSpawnProcess({
      stdout: JSON.stringify({ url: ytdlpUrl, http_headers: { 'User-Agent': 'yt-dlp-test' } }),
      onSpawn: () => { spawnCount += 1; },
    }),
    requestUpstream,
    downloaderPath: 'yt-dlp-test',
  });

  const first = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(first.status, 200);
  assert.equal(await first.text(), 'audio-data');
  assert.equal(innertubeCalls, 1);
  assert.equal(spawnCount, 1);
  assert.deepEqual(upstreamCalls.map((call) => call.url), [innertubeUrl, ytdlpUrl]);
  assert.deepEqual(upstreamCalls[1].headers, { 'User-Agent': 'yt-dlp-test', Range: 'bytes=0-' });

  const second = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(second.status, 200);
  assert.equal(await second.text(), 'audio-data');
  assert.equal(innertubeCalls, 1);
  assert.equal(spawnCount, 1);
  assert.equal(upstreamCalls[2].url, ytdlpUrl);
});

const RANGE_DATA = '0123456789'.repeat(10);

function innertubeStub(url, counter = { calls: 0 }) {
  return async () => {
    counter.calls += 1;
    return { url, httpHeaders: { 'User-Agent': 'innertube-test' }, resolveMs: 1, resolver: 'innertube' };
  };
}

// Upstream falso que respeita Range e devolve Content-Range. failFrom devolve 403 a partir desse byte.
function createRangeUpstream(data, requests, failFrom = null) {
  return (target, options, onResponse) => {
    requests.push({ url: target.toString(), range: options.headers.Range });
    const match = /^bytes=(\d+)-(\d*)$/.exec(options.headers.Range ?? '');
    const request = new EventEmitter();
    request.destroyed = false;
    request.end = () => setImmediate(() => {
      const response = new PassThrough();
      const from = Number(match[1]);
      const to = Math.min(match[2] === '' ? data.length - 1 : Number(match[2]), data.length - 1);
      if (failFrom !== null && from >= failFrom) {
        response.statusCode = 403;
        response.headers = {};
        onResponse(response);
        response.end();
        return;
      }
      response.statusCode = 206;
      response.headers = {
        'accept-ranges': 'bytes',
        'content-range': `bytes ${from}-${to}/${data.length}`,
        'content-length': String(to - from + 1),
        'content-type': 'audio/mp4',
      };
      onResponse(response);
      response.end(data.slice(from, to + 1));
    });
    request.destroy = () => {
      request.destroyed = true;
    };
    return request;
  };
}

test('chunked Innertube stream without a client Range joins the blocks into a 200 response', async (t) => {
  const data = RANGE_DATA.slice(0, 10);
  const requests = [];
  const baseUrl = await startAppServer(t, {
    upstreamChunkBytes: 4,
    innertubeResolver: innertubeStub('https://r1---sn.googlevideo.com/videoplayback?signature=chunk-a'),
    requestUpstream: createRangeUpstream(data, requests),
    downloaderPath: 'yt-dlp-test',
  });

  const response = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-range'), null);
  assert.equal(response.headers.get('content-length'), '10');
  assert.equal(await response.text(), data);
  assert.deepEqual(requests.map((request) => request.range), ['bytes=0-3', 'bytes=4-7', 'bytes=8-9']);
});

test('chunked Innertube stream answers a bounded client Range with 206 and Content-Range', async (t) => {
  const requests = [];
  const baseUrl = await startAppServer(t, {
    upstreamChunkBytes: 4,
    innertubeResolver: innertubeStub('https://r1---sn.googlevideo.com/videoplayback?signature=chunk-b'),
    requestUpstream: createRangeUpstream(RANGE_DATA, requests),
    downloaderPath: 'yt-dlp-test',
  });

  const response = await fetch(`${baseUrl}/stream/abcdefghijk`, { headers: { Range: 'bytes=10-19' } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 10-19/100');
  assert.equal(response.headers.get('content-length'), '10');
  assert.equal(await response.text(), RANGE_DATA.slice(10, 20));
  assert.deepEqual(requests.map((request) => request.range), ['bytes=10-13', 'bytes=14-17', 'bytes=18-19']);
});

test('chunked Innertube stream answers an open-ended client Range up to the end of the audio', async (t) => {
  const requests = [];
  const baseUrl = await startAppServer(t, {
    upstreamChunkBytes: 4,
    innertubeResolver: innertubeStub('https://r1---sn.googlevideo.com/videoplayback?signature=chunk-c'),
    requestUpstream: createRangeUpstream(RANGE_DATA, requests),
    downloaderPath: 'yt-dlp-test',
  });

  const response = await fetch(`${baseUrl}/stream/abcdefghijk`, { headers: { Range: 'bytes=95-' } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 95-99/100');
  assert.equal(response.headers.get('content-length'), '5');
  assert.equal(await response.text(), RANGE_DATA.slice(95));
  assert.deepEqual(requests.map((request) => request.range), ['bytes=95-98', 'bytes=99-99']);
});

test('cancelling the app request destroys the active Innertube block request', async (t) => {
  const requests = [];
  const requestUpstream = (_target, _options, onResponse) => {
    const request = new EventEmitter();
    request.destroyed = false;
    request.end = () => setImmediate(() => {
      const response = new PassThrough();
      response.statusCode = 206;
      response.headers = { 'content-range': 'bytes 0-3/100', 'content-length': '4' };
      onResponse(response);
      response.write('ab'); // o bloco nunca termina
    });
    request.destroy = () => {
      request.destroyed = true;
    };
    requests.push(request);
    return request;
  };
  const baseUrl = await startAppServer(t, {
    upstreamChunkBytes: 4,
    innertubeResolver: innertubeStub('https://r1---sn.googlevideo.com/videoplayback?signature=cancel'),
    requestUpstream,
    downloaderPath: 'yt-dlp-test',
  });

  const controller = new AbortController();
  const response = await fetch(`${baseUrl}/stream/abcdefghijk`, { signal: controller.signal });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  await reader.read();
  controller.abort();
  await reader.read().catch(() => {});

  for (let i = 0; i < 100 && !requests[0].destroyed; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(requests.length, 1);
  assert.equal(requests[0].destroyed, true);
});

test('a 403 on a later Innertube block routes the next retry through yt-dlp', async (t) => {
  const future = Math.floor(Date.now() / 1000) + 600;
  const innertubeUrl = `https://r1---sn.googlevideo.com/videoplayback?signature=block403&expire=${future}`;
  const ytdlpUrl = `https://r1---sn.googlevideo.com/videoplayback?signature=ytdlp&expire=${future}`;
  const counter = { calls: 0 };
  const innertubeRequests = [];
  const fallbackRequests = [];
  const baseUrl = await startAppServer(t, {
    upstreamChunkBytes: 4,
    innertubeResolver: innertubeStub(innertubeUrl, counter),
    spawnProcess: createSpawnProcess({
      stdout: JSON.stringify({ url: ytdlpUrl }),
    }),
    requestUpstream: (target, options, onResponse) => {
      if (target.toString() === innertubeUrl) {
        return createRangeUpstream(RANGE_DATA.slice(0, 10), innertubeRequests, 4)(target, options, onResponse);
      }
      return createAudioUpstream(fallbackRequests)(target, options, onResponse);
    },
    downloaderPath: 'yt-dlp-test',
  });

  const first = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(first.status, 200);
  const cutBody = await first.arrayBuffer().catch((error) => error);
  assert.ok(cutBody instanceof Error);
  assert.equal(counter.calls, 1);

  const second = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(second.status, 200);
  assert.equal(await second.text(), 'audio-data');
  assert.equal(counter.calls, 1);
  assert.equal(innertubeRequests.length, 2);
  assert.equal(fallbackRequests.length, 1);
});

const silentLogger = { log() {}, info() {}, warn() {}, error() {} };

async function startAppServer(t, options) {
  const server = createApp({ ...options, logger: silentLogger }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

function createSpawnProcess({ stdout = '', exitCode = 0, onSpawn = () => {} } = {}) {
  return (_path, args) => {
    onSpawn(args);
    const process = new EventEmitter();
    process.exitCode = null;
    process.signalCode = null;
    process.stdout = new PassThrough();
    process.stderr = new PassThrough();
    process.kill = () => true;
    setImmediate(() => {
      process.stdout.end(stdout);
      process.stderr.end(exitCode === 0 ? '' : 'ERROR: HTTP Error 403: Forbidden\n');
      process.exitCode = exitCode;
      process.emit('close', exitCode);
    });
    return process;
  };
}

function createAudioUpstream(calls) {
  return (url, options, onResponse) => {
    calls.push({ url: url.toString(), headers: options.headers });
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
}

test('Innertube resolves the stream and yt-dlp is not spawned', async (t) => {
  const expectedUrl = 'https://r1---sn.googlevideo.com/videoplayback?signature=inn';
  const upstreamCalls = [];
  let innertubeCalls = 0;
  let spawnCount = 0;
  const baseUrl = await startAppServer(t, {
    innertubeResolver: async () => {
      innertubeCalls += 1;
      return { url: expectedUrl, httpHeaders: { 'User-Agent': 'innertube-test' }, resolveMs: 1, resolver: 'innertube' };
    },
    spawnProcess: createSpawnProcess({ onSpawn: () => { spawnCount += 1; } }),
    requestUpstream: createAudioUpstream(upstreamCalls),
    downloaderPath: 'yt-dlp-test',
  });

  const response = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'audio-data');
  assert.equal(innertubeCalls, 1);
  assert.equal(spawnCount, 0);
  assert.equal(upstreamCalls[0].url, expectedUrl);
  assert.deepEqual(upstreamCalls[0].headers, { 'User-Agent': 'innertube-test', Range: 'bytes=0-262143' });
});

test('yt-dlp is used when Innertube fails', async (t) => {
  const expectedUrl = 'https://r1---sn.googlevideo.com/videoplayback?signature=ytd';
  const upstreamCalls = [];
  let spawnCount = 0;
  const baseUrl = await startAppServer(t, {
    innertubeResolver: async () => {
      throw new Error('Innertube failed (ANDROID_VR: boom)');
    },
    spawnProcess: createSpawnProcess({
      stdout: JSON.stringify({ url: expectedUrl, http_headers: {} }),
      onSpawn: () => { spawnCount += 1; },
    }),
    requestUpstream: createAudioUpstream(upstreamCalls),
    downloaderPath: 'yt-dlp-test',
  });

  const response = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'audio-data');
  assert.equal(spawnCount, 1);
  assert.equal(upstreamCalls[0].url, expectedUrl);
});

test('stream returns 502 when Innertube and yt-dlp both fail', async (t) => {
  let spawnCount = 0;
  const baseUrl = await startAppServer(t, {
    innertubeResolver: async () => {
      throw new Error('Innertube failed');
    },
    spawnProcess: createSpawnProcess({
      exitCode: 1,
      onSpawn: () => { spawnCount += 1; },
    }),
    downloaderPath: 'yt-dlp-test',
  });

  const response = await fetch(`${baseUrl}/stream/abcdefghijk`);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'stream_unavailable' });
  assert.equal(spawnCount, 1);
});