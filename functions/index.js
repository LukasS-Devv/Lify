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
const FORWARDED_RESPONSE_HEADERS = [
  'accept-ranges',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
];

function createApp({
  spawnProcess = spawn,
  requestUpstream = https.request,
  downloaderPath = ytdlp.constants.YOUTUBE_DL_PATH,
} = {}) {
  const app = express();
  app.disable('x-powered-by');

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

    const sourceUrl = `https://music.youtube.com/watch?v=${videoId}`;
    let extractor;
    let failed = false;
    let cancelled = false;
    let extractorLog = '';
    let extractorOutput = '';
    let upstreamRequest;

    const stopExtractor = () => {
      if (extractor && extractor.exitCode === null && extractor.signalCode === null) {
        extractor.kill('SIGTERM');
      }
    };

    const fail = (error, stage = 'yt-dlp') => {
      if (failed || cancelled || res.writableEnded) return;
      failed = true;
      console.error(`[stream] ${videoId} ${stage} falhou`, {
        message: error instanceof Error ? error.message : String(error),
        stderr: extractorLog.slice(-MAX_LOG_LENGTH),
      });
      stopExtractor();
      if (!res.headersSent) {
        res.status(502).json({ error: 'stream_unavailable' });
      } else {
        res.destroy(error instanceof Error ? error : undefined);
      }
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
      fail(error);
      return;
    }

    extractor.stdout.on('data', (chunk) => {
      extractorOutput += chunk.toString();
      if (extractorOutput.length > MAX_EXTRACTOR_OUTPUT_LENGTH) {
        fail(new Error('yt-dlp output exceeded the maximum metadata length'));
      }
    });
    extractor.stderr.on('data', (chunk) => {
      extractorLog = `${extractorLog}${chunk}`.slice(-MAX_LOG_LENGTH);
    });

    extractor.once('error', fail);
    extractor.once('close', (code) => {
      if (cancelled || failed) return;
      if (code !== 0) {
        fail(new Error(`process exited with code ${code}`));
        return;
      }

      let streamInfo;
      try {
        streamInfo = JSON.parse(extractorOutput);
      } catch {
        fail(new Error('yt-dlp returned invalid stream metadata'));
        return;
      }
      let streamUrl;
      try {
        streamUrl = new URL(streamInfo.url);
      } catch {
        fail(new Error('yt-dlp returned an invalid stream URL'));
        return;
      }
      if (streamUrl.protocol !== 'https:' || !streamUrl.hostname.endsWith('.googlevideo.com')) {
        fail(new Error('yt-dlp returned an unsupported stream URL'));
        return;
      }

      const upstreamHeaders = Object.fromEntries(
        Object.entries(streamInfo.http_headers ?? {}).filter(([, value]) => typeof value === 'string'),
      );
      if (typeof req.headers.range === 'string') upstreamHeaders.Range = req.headers.range;
      if (typeof req.headers['if-range'] === 'string') upstreamHeaders['If-Range'] = req.headers['if-range'];

      try {
        upstreamRequest = requestUpstream(streamUrl, { headers: upstreamHeaders }, (upstreamResponse) => {
          if (cancelled || res.destroyed) {
            upstreamResponse.destroy();
            return;
          }
          for (const name of FORWARDED_RESPONSE_HEADERS) {
            const value = upstreamResponse.headers[name];
            if (value !== undefined) res.setHeader(name, value);
          }
          res.setHeader('Cache-Control', 'no-store, no-transform');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.status(upstreamResponse.statusCode || 502);
          upstreamResponse.once('error', (error) => fail(error, 'upstream'));
          upstreamResponse.pipe(res);
        });
        upstreamRequest.once('error', (error) => fail(error, 'upstream'));
        upstreamRequest.end();
      } catch (error) {
        fail(error, 'upstream');
      }
    });

    req.once('aborted', () => {
      cancelled = true;
      stopExtractor();
      upstreamRequest?.destroy();
    });
    res.once('close', () => {
      if (!res.writableEnded) {
        cancelled = true;
        stopExtractor();
        upstreamRequest?.destroy();
      }
    });
  });

  return app;
}

const app = createApp();
module.exports = { app, createApp };

if (require.main === module) {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[stream] servidor local em http://0.0.0.0:${port}`);
  });
}
