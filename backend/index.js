'use strict';

const { spawn } = require('node:child_process');
const https = require('node:https');
const express = require('express');
const ytdlp = require('youtube-dl-exec');

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const MAX_LOG_LENGTH = 4000;
const MAX_EXTRACTOR_OUTPUT_LENGTH = 1_048_576;
const AUDIO_FORMATS = {
  dataSaver: 'bestaudio[abr<=64]/bestaudio[abr<=96]/worstaudio',
  standard: 'bestaudio[abr<=128]/bestaudio[abr<=160]/bestaudio',
};
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_UPSTREAM_REDIRECTS = 3;
const FORWARDED_RESPONSE_HEADERS = [
  'accept-ranges',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
];
const DEFAULT_OPTIONS = {
  extractorTimeoutMs: 15_000,
  upstreamTimeoutMs: 15_000,
  upstreamInactivityTimeoutMs: 30_000,
  maxConcurrentResolvers: 4,
  maxCacheEntries: 200,
  maxCacheAgeMs: 5 * 60_000,
  cacheExpirySafetyMs: 30_000,
};

class StreamError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'StreamError';
    this.statusCode = statusCode;
  }
}

function getUrlExpiry(streamUrl) {
  const value = Number(streamUrl.searchParams.get('expire'));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value > 1_000_000_000_000 ? value : value * 1000;
}

/**
 * O googlevideo às vezes responde 302 apontando para outro servidor de mídia. Seguimos o
 * redirecionamento aqui, mas só para https://*.googlevideo.com (evita virar proxy aberto).
 */
function resolveRedirect(from, location) {
  if (typeof location !== 'string' || !location) return null;
  let target;
  try {
    target = new URL(location, from);
  } catch {
    return null;
  }
  if (target.protocol !== 'https:' || !target.hostname.endsWith('.googlevideo.com')) return null;
  return target;
}

function createApp({
  spawnProcess = spawn,
  requestUpstream = https.request,
  downloaderPath = ytdlp.constants.YOUTUBE_DL_PATH,
  logger = console,
  ...providedOptions
} = {}) {
  const options = { ...DEFAULT_OPTIONS, ...providedOptions };
  const cache = new Map();
  const pendingResolutions = new Map();
  let activeResolvers = 0;
  const app = express();
  app.disable('x-powered-by');

  function getCachedResolution(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return null;
    }
    cache.delete(key);
    cache.set(key, entry);
    return entry.value;
  }

  function cacheResolution(key, value) {
    const expiry = getUrlExpiry(new URL(value.url));
    if (!expiry) return;
    const ttl = Math.min(options.maxCacheAgeMs, expiry - Date.now() - options.cacheExpirySafetyMs);
    if (ttl <= 0) return;

    cache.delete(key);
    cache.set(key, { value, expiresAt: Date.now() + ttl });
    while (cache.size > options.maxCacheEntries) {
      cache.delete(cache.keys().next().value);
    }
  }

  function extractStream(videoId, profile) {
    return new Promise((resolve, reject) => {
      const sourceUrl = `https://music.youtube.com/watch?v=${videoId}`;
      let extractor;
      let extractorLog = '';
      let extractorOutput = '';
      let settled = false;
      const startedAt = Date.now();
      let timeout;

      const finish = (error, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve(result);
      };

      try {
        extractor = spawnProcess(downloaderPath, [
          '--dump-single-json',
          '--skip-download',
          '--format', AUDIO_FORMATS[profile],
          '--no-playlist',
          '--quiet',
          '--no-warnings',
          '--no-progress',
          '--',
          sourceUrl,
        ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (error) {
        finish(error);
        return;
      }

      timeout = setTimeout(() => {
        if (extractor.exitCode === null && extractor.signalCode === null) extractor.kill('SIGTERM');
        finish(new StreamError('yt-dlp resolution timed out', 504));
      }, options.extractorTimeoutMs);

      extractor.stdout.on('data', (chunk) => {
        extractorOutput += chunk.toString();
        if (extractorOutput.length > MAX_EXTRACTOR_OUTPUT_LENGTH) {
          if (extractor.exitCode === null && extractor.signalCode === null) extractor.kill('SIGTERM');
          finish(new Error('yt-dlp output exceeded the maximum metadata length'));
        }
      });
      extractor.stderr.on('data', (chunk) => {
        extractorLog = `${extractorLog}${chunk}`.slice(-MAX_LOG_LENGTH);
      });

      extractor.once('error', (error) => finish(error));
      extractor.once('close', (code) => {
        if (code !== 0) {
          const error = new Error(`yt-dlp process exited with code ${code}`);
          error.stderr = extractorLog.slice(-MAX_LOG_LENGTH);
          finish(error);
          return;
        }

        let streamInfo;
        try {
          streamInfo = JSON.parse(extractorOutput);
        } catch {
          finish(new Error('yt-dlp returned invalid stream metadata'));
          return;
        }

        let streamUrl;
        try {
          streamUrl = new URL(streamInfo.url);
        } catch {
          finish(new Error('yt-dlp returned an invalid stream URL'));
          return;
        }
        if (streamUrl.protocol !== 'https:' || !streamUrl.hostname.endsWith('.googlevideo.com')) {
          finish(new Error('yt-dlp returned an unsupported stream URL'));
          return;
        }

        const httpHeaders = Object.fromEntries(
          Object.entries(streamInfo.http_headers ?? {}).filter(([, value]) => typeof value === 'string'),
        );
        finish(null, {
          url: streamUrl.toString(),
          httpHeaders,
          resolveMs: Date.now() - startedAt,
        });
      });
    });
  }

  function resolveStream(videoId, profile) {
    const key = `${profile}:${videoId}`;
    const cached = getCachedResolution(key);
    if (cached) return { promise: Promise.resolve({ ...cached, resolveMs: 0 }), source: 'hit' };

    const pending = pendingResolutions.get(key);
    if (pending) return { promise: pending, source: 'shared' };

    if (activeResolvers >= options.maxConcurrentResolvers) {
      return {
        promise: Promise.reject(new StreamError('Too many stream resolutions in progress', 503)),
        source: 'limited',
      };
    }

    activeResolvers += 1;
    const promise = extractStream(videoId, profile)
      .then((result) => {
        cacheResolution(key, result);
        return result;
      })
      .finally(() => {
        activeResolvers -= 1;
        pendingResolutions.delete(key);
      });
    pendingResolutions.set(key, promise);
    return { promise, source: 'miss' };
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/stream/:videoId', (req, res) => {
    const { videoId } = req.params;
    if (!VIDEO_ID_PATTERN.test(videoId)) {
      res.status(400).json({ error: 'invalid_video_id' });
      return;
    }
    const profile = req.query.profile ?? 'standard';
    if (typeof profile !== 'string' || !Object.hasOwn(AUDIO_FORMATS, profile)) {
      res.status(400).json({ error: 'invalid_playback_profile' });
      return;
    }

    const requestStartedAt = Date.now();
    let cancelled = false;
    let upstreamRequest;
    let upstreamResponse;
    let upstreamTimer;
    let resolutionSource = 'miss';
    let resolveMs = 0;
    let resolutionCompletedAt = requestStartedAt;
    let upstreamMs = null;
    let firstByteMs = null;
    let responseStatus = 502;
    let logged = false;

    const logRequest = (event) => {
      if (logged) return;
      logged = true;
      logger.info(`[stream] ${JSON.stringify({
        event,
        videoId,
        profile,
        resolutionSource,
        resolveMs,
        upstreamMs,
        firstByteMs,
        totalMs: Date.now() - requestStartedAt,
        status: responseStatus,
      })}`);
    };

    const fail = (error, stage) => {
      if (cancelled || res.writableEnded || res.destroyed) return;
      clearTimeout(upstreamTimer);
      responseStatus = error.statusCode || 502;
      logger.error(`[stream] ${videoId} ${stage} failed`, {
        message: error instanceof Error ? error.message : String(error),
        stderr: error.stderr,
      });
      if (!res.headersSent) {
        res.status(responseStatus).json({
          error: responseStatus === 503 ? 'server_busy' : responseStatus === 504 ? 'stream_timeout' : 'stream_unavailable',
        });
      } else {
        res.destroy(error instanceof Error ? error : undefined);
      }
      logRequest('failed');
    };

    const resolved = resolveStream(videoId, profile);
    resolutionSource = resolved.source;
    if (resolutionSource === 'limited') res.setHeader('Retry-After', '2');

    resolved.promise.then((stream) => {
      if (cancelled || res.destroyed) return;
      resolveMs = stream.resolveMs;
      resolutionCompletedAt = Date.now();
      const upstreamHeaders = { ...stream.httpHeaders };
      if (typeof req.headers.range === 'string') upstreamHeaders.Range = req.headers.range;
      if (typeof req.headers['if-range'] === 'string') upstreamHeaders['If-Range'] = req.headers['if-range'];

      const openUpstream = (url, redirectsLeft) => {
        upstreamTimer = setTimeout(() => {
          upstreamRequest?.destroy(new StreamError('Upstream response timed out', 504));
        }, options.upstreamTimeoutMs);
        upstreamRequest = requestUpstream(url, { headers: upstreamHeaders }, (response) => {
          clearTimeout(upstreamTimer);
          if (cancelled || res.destroyed) {
            response.destroy();
            return;
          }
          if (REDIRECT_STATUSES.has(response.statusCode)) {
            response.resume?.();
            const target = redirectsLeft > 0 ? resolveRedirect(url, response.headers.location) : null;
            if (!target) {
              fail(new StreamError('Upstream redirect was rejected'), 'upstream');
              return;
            }
            openUpstream(target, redirectsLeft - 1);
            return;
          }
          upstreamResponse = response;
          upstreamMs = Date.now() - resolutionCompletedAt;
          for (const name of FORWARDED_RESPONSE_HEADERS) {
            const value = response.headers[name];
            if (value !== undefined) res.setHeader(name, value);
          }
          res.setHeader('Cache-Control', 'no-store, no-transform');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          responseStatus = response.statusCode || 502;
          res.status(responseStatus);
          response.once('data', () => {
            if (firstByteMs === null) firstByteMs = Date.now() - requestStartedAt;
          });
          response.setTimeout?.(options.upstreamInactivityTimeoutMs, () => {
            response.destroy(new StreamError('Upstream audio stalled', 504));
          });
          response.once('error', (error) => fail(error, 'upstream'));
          response.pipe(res);
        });
        upstreamRequest.once('error', (error) => fail(error, 'upstream'));
        upstreamRequest.setTimeout?.(options.upstreamTimeoutMs, () => {
          upstreamRequest.destroy(new StreamError('Upstream connection timed out', 504));
        });
        upstreamRequest.end();
      };

      try {
        openUpstream(new URL(stream.url), MAX_UPSTREAM_REDIRECTS);
      } catch (error) {
        fail(error, 'upstream');
      }
    }).catch((error) => fail(error, 'yt-dlp'));

    res.once('finish', () => logRequest('complete'));
    req.once('aborted', () => {
      cancelled = true;
      clearTimeout(upstreamTimer);
      upstreamRequest?.destroy();
      upstreamResponse?.destroy();
    });
    res.once('close', () => {
      if (!res.writableEnded) {
        cancelled = true;
        clearTimeout(upstreamTimer);
        upstreamRequest?.destroy();
        upstreamResponse?.destroy();
      }
    });
  });

  return app;
}

const app = createApp();
module.exports = { app, createApp };

if (require.main === module) {
  const port = 4000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[stream] The server is online on port ${port}`);
  });
}