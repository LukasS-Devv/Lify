'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const ytdlp = require('youtube-dl-exec');
const { Innertube, Constants } = require('youtubei.js');

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const MAX_LOG_LENGTH = 4000;
const MAX_EXTRACTOR_OUTPUT_LENGTH = 1_048_576;
const AUDIO_FORMATS = {
  dataSaver: 'bestaudio[abr<=64]/bestaudio[abr<=96]/worstaudio',
  standard: 'bestaudio[abr<=128]/bestaudio[abr<=160]/bestaudio',
};
const FORWARDED_RESPONSE_HEADERS = [
  'accept-ranges',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
];
const DEFAULT_UPSTREAM_CHUNK_BYTES = 262_144;

// UPSTREAM_CHUNK_BYTES: tamanho máximo de cada bloco pedido ao googlevideo. Valores inválidos usam o padrão.
function parseChunkBytes(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_UPSTREAM_CHUNK_BYTES;
}

const DEFAULT_OPTIONS = {
  extractorTimeoutMs: 45_000,
  upstreamTimeoutMs: 30_000,
  upstreamInactivityTimeoutMs: 30_000,
  maxConcurrentResolvers: 4,
  maxCacheEntries: 500,
  maxCacheAgeMs: 45 * 60_000,
  cacheExpirySafetyMs: 30_000,
  fallbackPreferenceMs: 2 * 60_000,
  upstreamChunkBytes: parseChunkBytes(process.env.UPSTREAM_CHUNK_BYTES),
};

// Cookies do YouTube (formato Netscape) fornecidos via variável de ambiente.
// O yt-dlp pode reescrever o ficheiro, por isso é gravado numa cópia temporária.
function prepareCookiesFile(env = process.env, logger = console) {
  const raw = env.YT_COOKIES;
  if (!raw || !raw.trim()) return null;
  try {
    const cookiesPath = path.join(os.tmpdir(), 'yt-cookies.txt');
    // Aceita quebras de linha reais ou escapadas (\n) caso o painel as escape.
    let content = raw.includes('\n') ? raw : raw.replace(/\\n/g, '\n');
    content = content.replace(/\r\n?/g, '\n').trim();
    if (!/^# (Netscape )?HTTP Cookie File/.test(content)) {
      content = `# Netscape HTTP Cookie File\n${content}`;
    }
    fs.writeFileSync(cookiesPath, `${content}\n`, { mode: 0o600 });
    logger.log?.(`[stream] YT_COOKIES loaded (${content.split('\n').length} lines)`);
    return cookiesPath;
  } catch (error) {
    logger.error?.('[stream] Failed to write YT_COOKIES file', error.message);
    return null;
  }
}

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

// Interpreta o Range do app: 'bytes=N-M' ou 'bytes=N-'. Outros formatos são tratados como ausentes.
function parseClientRange(header) {
  const match = typeof header === 'string' ? /^bytes=(\d+)-(\d*)$/.exec(header.trim()) : null;
  if (!match) return { requested: false, start: 0, end: null };
  const start = Number(match[1]);
  const end = match[2] === '' ? null : Number(match[2]);
  if (end !== null && end < start) return { requested: false, start: 0, end: null };
  return { requested: true, start, end };
}

// Innertube (youtubei.js): resolvedor principal, sem cookies.
const INNERTUBE_CLIENTS = ['ANDROID_VR', 'IOS', 'TV'];
const INNERTUBE_TIMEOUT_MS = 8_000;
const INNERTUBE_SESSION_MAX_AGE_MS = 6 * 60 * 60_000;
const INNERTUBE_MAX_CONSECUTIVE_FAILURES = 3;

let innertubeSession = null; // { promise, createdAt }
let innertubeFailures = 0;

// Sessão única e preguiçosa. É aquecida apenas no arranque direto (require.main).
function getInnertubeSession() {
  const expired = innertubeSession && Date.now() - innertubeSession.createdAt >= INNERTUBE_SESSION_MAX_AGE_MS;
  if (!innertubeSession || expired || innertubeFailures >= INNERTUBE_MAX_CONSECUTIVE_FAILURES) {
    const session = { createdAt: Date.now(), promise: Innertube.create() };
    // Uma criação falhada não fica em cache: a próxima chamada tenta de novo.
    session.promise.catch(() => {
      if (innertubeSession === session) innertubeSession = null;
    });
    innertubeSession = session;
    innertubeFailures = 0;
  }
  return innertubeSession.promise;
}

// standard: maior ≤128 kbps, senão ≤160, senão o melhor.
// dataSaver: maior ≤64 kbps, senão ≤96, senão o pior.
function chooseAudioFormat(formats, profile) {
  const candidates = formats
    .filter((format) => format.has_audio && !format.has_video && typeof format.bitrate === 'number')
    .map((format) => ({ format, kbps: format.bitrate / 1000 }))
    .sort((a, b) => b.kbps - a.kbps);
  const largestUnder = (limit) => candidates.find((candidate) => candidate.kbps <= limit);
  const pick = profile === 'dataSaver'
    ? largestUnder(64) ?? largestUnder(96) ?? candidates[candidates.length - 1]
    : largestUnder(128) ?? largestUnder(160) ?? candidates[0];
  return pick?.format ?? null;
}

async function resolveInnertubeClients(videoId, profile, startedAt) {
  const yt = await getInnertubeSession();
  const errors = [];
  for (const client of INNERTUBE_CLIENTS) {
    try {
      const info = await yt.getBasicInfo(videoId, { client });
      const format = chooseAudioFormat(info.streaming_data?.adaptive_formats ?? [], profile);
      if (!format) throw new Error('no audio-only format');
      const streamUrl = new URL(await format.decipher(yt.session.player));
      if (streamUrl.protocol !== 'https:' || !streamUrl.hostname.endsWith('.googlevideo.com')) {
        throw new Error('unsupported stream URL');
      }
      return {
        url: streamUrl.toString(),
        httpHeaders: { 'User-Agent': Constants.CLIENTS[client].USER_AGENT },
        resolveMs: Date.now() - startedAt,
        resolver: 'innertube',
      };
    } catch (error) {
      errors.push(`${client}: ${error.message}`);
    }
  }
  throw new Error(`Innertube failed (${errors.join('; ')})`);
}

async function resolveWithInnertube(videoId, profile) {
  const startedAt = Date.now();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Innertube resolution timed out')), INNERTUBE_TIMEOUT_MS);
  });
  try {
    const result = await Promise.race([resolveInnertubeClients(videoId, profile, startedAt), timeout]);
    innertubeFailures = 0;
    return result;
  } catch (error) {
    innertubeFailures += 1;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function createApp({
  spawnProcess = spawn,
  requestUpstream = https.request,
  downloaderPath = process.env.YT_DLP_PATH || ytdlp.constants.YOUTUBE_DL_PATH,
  logger = console,
  // Innertube primeiro; YT_RESOLVER=ytdlp desliga-o e usa apenas yt-dlp.
  innertubeResolver = process.env.YT_RESOLVER === 'ytdlp' ? null : resolveWithInnertube,
  cookiesPath = prepareCookiesFile(process.env, logger),
  // Opcionais (desligados por defeito, mantêm o comportamento original):
  // YT_PLAYER_CLIENTS=tv,mweb  e  YT_JS_RUNTIME=node
  playerClients = process.env.YT_PLAYER_CLIENTS || '',
  jsRuntime = process.env.YT_JS_RUNTIME === 'node' ? `node:${process.execPath}` : '',
  ...providedOptions
} = {}) {
  const options = { ...DEFAULT_OPTIONS, ...providedOptions };
  const cache = new Map();
  const pendingResolutions = new Map();
  const ytdlpPreferredUntil = new Map();
  // Ligação keep-alive partilhada pelos blocos ao googlevideo.
  const upstreamAgent = new https.Agent({ keepAlive: true });
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

  function preferYtdlpFor(key) {
    const now = Date.now();
    for (const [entryKey, expiresAt] of ytdlpPreferredUntil) {
      if (expiresAt <= now) ytdlpPreferredUntil.delete(entryKey);
    }
    ytdlpPreferredUntil.delete(key);
    ytdlpPreferredUntil.set(key, now + options.fallbackPreferenceMs);
    while (ytdlpPreferredUntil.size > options.maxCacheEntries) {
      ytdlpPreferredUntil.delete(ytdlpPreferredUntil.keys().next().value);
    }
  }

  async function extractStream(videoId, profile) {
    if (innertubeResolver) {
      try {
        return await innertubeResolver(videoId, profile);
      } catch (error) {
        logger.warn?.(`[stream] ${videoId} Innertube failed, falling back to yt-dlp`, error.message);
      }
    }
    return extractWithYtdlp(videoId, profile);
  }

  function extractWithYtdlp(videoId, profile) {
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
          ...(playerClients ? ['--extractor-args', `youtube:player_client=${playerClients}`] : []),
          ...(jsRuntime ? ['--js-runtimes', jsRuntime, '--remote-components', 'ejs:github'] : []),
          ...(cookiesPath ? ['--cookies', cookiesPath] : []),
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
          resolver: 'ytdlp',
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

    const preferYtdlp = (ytdlpPreferredUntil.get(key) ?? 0) > Date.now();
    if (!preferYtdlp) ytdlpPreferredUntil.delete(key);
    activeResolvers += 1;
    const promise = (preferYtdlp ? extractWithYtdlp(videoId, profile) : extractStream(videoId, profile))
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

  // Apaga a entrada do cache e resolve de novo só pelo yt-dlp.
  function refreshWithYtdlp(key, videoId, profile) {
    cache.delete(key);
    return extractWithYtdlp(videoId, profile).then((result) => {
      cacheResolution(key, result);
      return result;
    });
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
    let resolver = null;
    let resolveMs = 0;
    let resolutionCompletedAt = requestStartedAt;
    let upstreamMs = null;
    let firstByteMs = null;
    let responseStatus = 502;
    let chunksRequested = 0;
    let logged = false;

    const logRequest = (event) => {
      if (logged) return;
      logged = true;
      logger.info(`[stream] ${JSON.stringify({
        event,
        videoId,
        profile,
        resolutionSource,
        resolver,
        resolveMs,
        upstreamMs,
        firstByteMs,
        chunks: chunksRequested,
        chunkBytes: resolver === 'innertube' ? options.upstreamChunkBytes : null,
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

    const cacheKey = `${profile}:${videoId}`;
    let retriedWithYtdlp = false;

    // Proxy em blocos para o resolvedor Innertube: cada bloco é um pedido 'bytes=a-b' com no máximo
    // options.upstreamChunkBytes, escrito na mesma resposta ao app.
    const startChunked = (stream) => {
      const chunkBytes = options.upstreamChunkBytes;
      const range = parseClientRange(req.headers.range);
      const upstreamUrl = new URL(stream.url);
      const baseHeaders = { ...stream.httpHeaders };
      if (typeof req.headers['if-range'] === 'string') baseHeaders['If-Range'] = req.headers['if-range'];
      let total = null;
      let last = range.end; // último byte absoluto pedido (inclusivo); null = até ao fim
      let headersSent = false;

      const openBlock = (targetUrl, headers, redirectsLeft, onResponse) => {
        clearTimeout(upstreamTimer);
        upstreamTimer = setTimeout(() => {
          upstreamRequest?.destroy(new StreamError('Upstream response timed out', 504));
        }, options.upstreamTimeoutMs);
        upstreamRequest = requestUpstream(targetUrl, { headers, agent: upstreamAgent }, (response) => {
          const status = response.statusCode || 502;
          const location = response.headers.location;
          if ([301, 302, 303, 307, 308].includes(status) && location && !cancelled && !res.destroyed) {
            response.resume();
            let next;
            try {
              next = new URL(location, targetUrl);
            } catch {
              fail(new Error('Invalid upstream redirect'), 'upstream');
              return;
            }
            if (redirectsLeft <= 0 || next.protocol !== 'https:' || !next.hostname.endsWith('.googlevideo.com')) {
              fail(new Error('Unsupported upstream redirect'), 'upstream');
              return;
            }
            openBlock(next, headers, redirectsLeft - 1, onResponse);
            return;
          }
          clearTimeout(upstreamTimer);
          onResponse(response);
        });
        const current = upstreamRequest;
        current.once('error', (error) => fail(error, 'upstream'));
        current.setTimeout?.(options.upstreamTimeoutMs, () => {
          current.destroy(new StreamError('Upstream connection timed out', 504));
        });
        current.end();
      };

      const observeBlock = (response) => {
        response.on('data', () => {
          if (firstByteMs === null) firstByteMs = Date.now() - requestStartedAt;
        });
        response.setTimeout?.(options.upstreamInactivityTimeoutMs, () => {
          response.destroy(new StreamError('Upstream audio stalled', 504));
        });
        response.once('error', (error) => fail(error, 'upstream'));
      };

      const requestBlock = (from) => {
        let to = from + chunkBytes - 1;
        if (last !== null) to = Math.min(to, last);
        chunksRequested += 1;
        openBlock(upstreamUrl, { ...baseHeaders, Range: `bytes=${from}-${to}` }, 3, (response) => onBlock(response, from));
      };

      const onBlock = (response, from) => {
        upstreamResponse = response;
        if (cancelled || res.destroyed) {
          response.destroy();
          return;
        }
        const status = response.statusCode || 502;

        if (status === 403 || status === 410) {
          response.resume();
          if (!headersSent && !retriedWithYtdlp) {
            retryWithYtdlp(status);
            return;
          }
          cache.delete(cacheKey);
          preferYtdlpFor(cacheKey);
          logger.warn?.(`[stream] ${videoId} upstream ${status} on a later Innertube block; next request will use yt-dlp`);
          fail(new Error(`Upstream returned ${status} at byte ${from}`), 'upstream');
          return;
        }

        if (status === 200 && from === 0 && !headersSent) {
          // O upstream ignorou Range: o corpo é o ficheiro completo, enviado como 200.
          upstreamMs = Date.now() - resolutionCompletedAt;
          for (const name of FORWARDED_RESPONSE_HEADERS) {
            const value = response.headers[name];
            if (value !== undefined) res.setHeader(name, value);
          }
          res.setHeader('Cache-Control', 'no-store, no-transform');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          responseStatus = 200;
          res.status(200);
          headersSent = true;
          observeBlock(response);
          response.pipe(res);
          return;
        }

        const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers['content-range'] ?? '');
        if (status !== 206 || !match || Number(match[1]) !== from || Number(match[2]) < from || Number(match[2]) >= Number(match[3])) {
          response.resume();
          fail(new Error(`Unexpected upstream block response (${status})`), 'upstream');
          return;
        }
        const blockEnd = Number(match[2]);
        const blockTotal = Number(match[3]);
        if (total === null) {
          total = blockTotal;
          last = range.end === null ? total - 1 : Math.min(range.end, total - 1);
          if (range.start > last) {
            response.resume();
            fail(new Error('Requested range is outside the audio'), 'upstream');
            return;
          }
          for (const name of FORWARDED_RESPONSE_HEADERS) {
            if (name === 'content-range' || name === 'content-length') continue;
            const value = response.headers[name];
            if (value !== undefined) res.setHeader(name, value);
          }
          res.setHeader('Cache-Control', 'no-store, no-transform');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          if (range.requested) {
            res.setHeader('Content-Range', `bytes ${range.start}-${last}/${total}`);
            res.setHeader('Content-Length', String(last - range.start + 1));
          } else {
            res.setHeader('Content-Length', String(total));
          }
          responseStatus = range.requested ? 206 : 200;
          res.status(responseStatus);
          headersSent = true;
          upstreamMs = Date.now() - resolutionCompletedAt;
        } else if (blockTotal !== total) {
          response.resume();
          fail(new Error('Upstream audio size changed between blocks'), 'upstream');
          return;
        }

        const expected = blockEnd - from + 1;
        let received = 0;
        response.on('data', (chunk) => {
          received += chunk.length;
        });
        observeBlock(response);
        response.once('end', () => {
          if (received !== expected) {
            fail(new Error(`Upstream block ended early (${received}/${expected} bytes)`), 'upstream');
            return;
          }
          if (cancelled || res.destroyed) return;
          const next = blockEnd + 1;
          if (next > last) {
            res.end();
            return;
          }
          requestBlock(next);
        });
        response.pipe(res, { end: false });
      };

      requestBlock(range.start);
    };

    const startStream = (stream) => {
      if (cancelled || res.destroyed) return;
      resolver = stream.resolver;
      resolveMs = stream.resolveMs;
      resolutionCompletedAt = Date.now();
      if (resolver === 'innertube') {
        startChunked(stream);
        return;
      }
      const clientRange = typeof req.headers.range === 'string';
      const upstreamHeaders = { ...stream.httpHeaders };
      // Sem Range do cliente, o googlevideo recusa URLs do Innertube (403): pede-se 'bytes=0-' ao upstream.
      upstreamHeaders.Range = clientRange ? req.headers.range : 'bytes=0-';
      if (typeof req.headers['if-range'] === 'string') upstreamHeaders['If-Range'] = req.headers['if-range'];

      try {
        const startUpstreamTimer = () => {
          clearTimeout(upstreamTimer);
          upstreamTimer = setTimeout(() => {
            upstreamRequest?.destroy(new StreamError('Upstream response timed out', 504));
          }, options.upstreamTimeoutMs);
        };
        const openUpstream = (targetUrl, redirectsLeft) => {
          startUpstreamTimer();
          upstreamRequest = requestUpstream(targetUrl, { headers: upstreamHeaders }, (response) => {
            const status = response.statusCode || 502;
            const location = response.headers.location;
            if ([301, 302, 303, 307, 308].includes(status) && location && !cancelled && !res.destroyed) {
              response.resume();
              let next;
              try {
                next = new URL(location, targetUrl);
              } catch {
                fail(new Error('Invalid upstream redirect'), 'upstream');
                return;
              }
              if (redirectsLeft <= 0 || next.protocol !== 'https:' || !next.hostname.endsWith('.googlevideo.com')) {
                fail(new Error('Unsupported upstream redirect'), 'upstream');
                return;
              }
              openUpstream(next, redirectsLeft - 1);
              return;
            }
            if ((status === 403 || status === 410) && !cancelled && !res.destroyed) {
              if (retriedWithYtdlp) {
                response.resume();
                fail(new Error(`Upstream returned ${status} after yt-dlp retry`), 'upstream');
                return;
              }
              if (resolver === 'innertube') {
                response.resume();
                retryWithYtdlp(status);
                return;
              }
            }
            clearTimeout(upstreamTimer);
            upstreamResponse = response;
            upstreamMs = Date.now() - resolutionCompletedAt;
            if (cancelled || res.destroyed) {
              response.destroy();
              return;
            }
            // Cliente sem Range: o 206 de 'bytes=0-' é entregue como 200 completo, sem content-range.
            const stripRange = !clientRange && status === 206;
            for (const name of FORWARDED_RESPONSE_HEADERS) {
              if (stripRange && name === 'content-range') continue;
              const value = response.headers[name];
              if (value !== undefined) res.setHeader(name, value);
            }
            res.setHeader('Cache-Control', 'no-store, no-transform');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            responseStatus = stripRange ? 200 : status;
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
          const current = upstreamRequest;
          current.once('error', (error) => fail(error, 'upstream'));
          current.setTimeout?.(options.upstreamTimeoutMs, () => {
            current.destroy(new StreamError('Upstream connection timed out', 504));
          });
          current.end();
        };
        openUpstream(new URL(stream.url), 3);
      } catch (error) {
        fail(error, 'upstream');
      }
    };

    // 403/410 numa URL do Innertube, antes de enviar bytes ao cliente: resolve de novo via yt-dlp, uma única vez.
    const retryWithYtdlp = (status) => {
      retriedWithYtdlp = true;
      clearTimeout(upstreamTimer);
      logger.warn?.(`[stream] ${videoId} upstream ${status} on Innertube URL, retrying with yt-dlp`);
      refreshWithYtdlp(cacheKey, videoId, profile)
        .then(startStream)
        .catch((error) => fail(error, 'resolver'));
    };

    resolved.promise.then(startStream).catch((error) => fail(error, 'resolver'));

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

  // Pré-resolve a faixa seguinte sem transmitir áudio; a reprodução usa o cache.
  app.get('/prefetch/:videoId', (req, res) => {
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

    const { promise, source } = resolveStream(videoId, profile);
    promise.catch((error) => logger.error?.(`[prefetch] ${videoId} failed`, error.message));
    res.status(202).json({ status: source });
  });

  return app;
}

const app = createApp();
module.exports = { app, createApp };

if (require.main === module) {
  const port = Number(process.env.PORT) || 4000;
  if (process.env.YT_RESOLVER !== 'ytdlp') {
    getInnertubeSession().then(
      () => console.log('[stream] Innertube session ready'),
      (error) => console.error('[stream] Innertube warm-up failed', error.message),
    );
  }
  app.listen(port, '0.0.0.0', () => {
    console.log(`[stream] The server is online on port ${port}`);
  });
}