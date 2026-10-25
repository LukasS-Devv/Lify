import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
  type Track as NativeTrack,
} from 'react-native-track-player';
import { catalog } from '@/services/catalog';
import { getDb, historyRepo, settingsRepo } from '@/database';
import type { RepeatMode, Track } from '@/types';
import {
  currentOf, appendRecommended, dropRecommended, nextIndex, playNext as qPlayNext, prevIndex,
  enqueue as qEnqueue, removeAt, setQueue, shuffleRest, emptyQueue,
} from './queue';
import { usePlayerStore, type PlayerStatus } from './store';
import { t as tr } from '@/i18n';
import { isDuplicateQueueEnd, queueEndSignature, type QueueEndSignature } from './queueEndGuard';

const store = () => usePlayerStore.getState();
let setupDone: Promise<void> | null = null;
const MAX_AUTOMATIC_RETRIES = 3;
const RETRY_STABILITY_SECONDS = 10;
let automaticRetry: { trackId: string; attempts: number; stableAfterPosition: number } | null = null;
let handledFailureToken: number | null = null;
let loadToken = 0; // invalida carregamentos antigos quando o usuário pula rápido
let queueEndTrackId: string | null = null;
let lastQueueEndEvent: QueueEndSignature | null = null;
let nativeOperations: Promise<void> = Promise.resolve();
let sleepTimer: ReturnType<typeof setTimeout> | null = null;

function serializeNative<T>(operation: () => Promise<T>): Promise<T> {
  const result = nativeOperations.then(operation);
  nativeOperations = result.then(() => undefined, () => undefined);
  return result;
}

function scheduleSleepTimer(endAt: number): void {
  const remaining = endAt - Date.now();
  if (remaining > 0) {
    sleepTimer = setTimeout(() => scheduleSleepTimer(endAt), Math.min(remaining, 2_147_000_000));
    return;
  }

  expireSleepTimer(endAt);
}

function expireSleepTimer(endAt: number): void {
  if (store().sleepTimerEndsAt !== endAt || Date.now() < endAt) return;
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = null;
  store().set({ sleepTimerEndsAt: null });
  const token = ++loadToken;
  void serializeNative(async () => {
    if (token === loadToken) await TrackPlayer.pause();
  }).then(
    () => { if (token === loadToken) store().set({ status: 'paused', error: null }); },
    (error: unknown) => {
      if (token === loadToken) store().set({
        status: 'error' as const,
        error: error instanceof Error ? error.message : tr('player.sleepTimer.pauseFailed'),
      });
    },
  );
}

function checkSleepTimer(): void {
  const endAt = store().sleepTimerEndsAt;
  if (endAt !== null && Date.now() >= endAt) expireSleepTimer(endAt);
}

export function setSleepTimer(minutes: number): void {
  if (!Number.isSafeInteger(minutes) || minutes <= 0 || !Number.isSafeInteger(Date.now() + minutes * 60_000)) {
    throw new RangeError('Sleep timer duration must be a positive, safe integer number of minutes.');
  }
  if (sleepTimer) clearTimeout(sleepTimer);
  const endAt = Date.now() + minutes * 60_000;
  store().set({ sleepTimerEndsAt: endAt });
  scheduleSleepTimer(endAt);
}

export function cancelSleepTimer(): void {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = null;
  store().set({ sleepTimerEndsAt: null });
}

/* ------------------------------ setup ------------------------------ */

export function setupAudio(): Promise<void> {
  if (!setupDone) {
    setupDone = (async () => {
      const settings = await settingsRepo.loadSettings(await getDb());
      try {
        await TrackPlayer.setupPlayer({
          autoHandleInterruptions: true,
          // minBuffer deve ser >= ao buffer de recuperação do ExoPlayer (5s por padrão)
          minBuffer: 10,
          maxBuffer: 15,
          playBuffer: 3,
          backBuffer: 0,
        });
      } catch (e) {
        // "already initialized" ao recarregar em dev
        if (!(e instanceof Error) || !/already been initialized/i.test(e.message)) throw e;
      }
      store().set({ repeat: settings.repeatMode });
      await TrackPlayer.updateOptions({
        // Mantém a música e a notificação do player ao fechar o app pelos recentes.
        android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback },
        capabilities: [
          Capability.Play, Capability.Pause, Capability.SkipToNext,
          Capability.SkipToPrevious, Capability.SeekTo, Capability.Stop,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
        progressUpdateEventInterval: 1,
      });
    })().catch((e) => {
      setupDone = null;
      throw e;
    });
  }
  return setupDone;
}

/**
 * Ao reabrir o app a fila em memória está vazia, mas o TrackPlayer nativo pode ainda
 * ter a fila tocando/pausada. Reconstrói o store a partir dele para o mini player voltar.
 */
export async function restoreNativeQueue(): Promise<void> {
  await setupAudio();
  if (store().queue.items.length > 0) return;

  const [nativeItems, index, playback] = await serializeNative(() => Promise.all([
    TrackPlayer.getQueue(),
    TrackPlayer.getActiveTrackIndex(),
    TrackPlayer.getPlaybackState(),
  ]));
  if (nativeItems.length === 0 || index === undefined || index < 0 || index >= nativeItems.length) return;
  if (store().queue.items.length > 0) return;

  store().set({
    queue: { items: nativeItems.map(nativeToTrack), index },
    status: statusFromNative(playback.state),
    error: null,
  });
}

function nativeToTrack(n: NativeTrack): Track {
  const id = String(n.id ?? '');
  const sep = id.indexOf(':');
  const source = id.startsWith('local:') ? 'local' : 'youtube';
  return {
    id,
    source,
    sourceId: source === 'local' && typeof n.url === 'string'
      ? n.url
      : sep >= 0 ? id.slice(sep + 1) : id,
    title: n.title ?? '',
    artist: n.artist ?? '',
    album: n.album ?? null,
    durationSec: typeof n.duration === 'number' ? n.duration : null,
    artworkUrl: typeof n.artwork === 'string' ? n.artwork : '',
  };
}

function statusFromNative(state: State): PlayerStatus {
  if (state === State.Playing) return 'playing';
  if (state === State.Paused || state === State.Ready) return 'paused';
  if (state === State.Buffering || state === State.Loading) return 'buffering';
  return 'idle';
}

/* ---------------------------- reprodução ---------------------------- */

async function loadAndPlay(track: Track, startAt = 0, isRetry = false): Promise<void> {
  const token = ++loadToken;
  if (!isRetry || automaticRetry?.trackId !== track.id) {
    automaticRetry = { trackId: track.id, attempts: 0, stableAfterPosition: startAt + RETRY_STABILITY_SECONDS };
  } else {
    automaticRetry.stableAfterPosition = startAt + RETRY_STABILITY_SECONDS;
  }
  store().set({ status: 'loading', error: null });
  try {
    await setupAudio();
    const stream = track.source === 'local'
      ? { url: track.sourceId, mimeType: null }
      : await catalog.getStream(track);
    if (token !== loadToken) return; // usuário já escolheu outra faixa

    await serializeNative(async () => {
      if (token !== loadToken) return;
      await TrackPlayer.reset();
      if (token !== loadToken) return;
      await TrackPlayer.add({
        id: track.id,
        url: stream.url,
        contentType: stream.mimeType?.split(';')[0],
        title: track.title,
        artist: track.artist || undefined,
        album: track.album ?? undefined,
        artwork: track.artworkUrl,
        duration: track.durationSec ?? undefined,
      });
      if (token !== loadToken) return;
      if (startAt > 0) await TrackPlayer.seekTo(startAt);
      if (token !== loadToken) return;
      await TrackPlayer.play();
    });

    if (token !== loadToken) return;
    if (!isRetry) {
      void recordHistory(track);
      void maybeFillQueue().catch(() => {}).then(prefetchNext);
    }
  } catch (e) {
    if (token !== loadToken) return;
    await onTrackFailed(track, token, e instanceof Error ? e.message : tr('player.error'), startAt);
  }
}

/**
 * Mantém a faixa atual durante retries; após o limite, pausa e deixa a decisão de
 * avançar ou tentar novamente com o usuário.
 */
async function onTrackFailed(track: Track, token: number, message: string, startAt: number): Promise<void> {
  if (token !== loadToken || currentOf(store().queue)?.id !== track.id || handledFailureToken === token) return;
  handledFailureToken = token;

  if (automaticRetry?.trackId !== track.id) {
    automaticRetry = { trackId: track.id, attempts: 0, stableAfterPosition: startAt + RETRY_STABILITY_SECONDS };
  }
  if (automaticRetry.attempts < MAX_AUTOMATIC_RETRIES) {
    automaticRetry.attempts += 1;
    console.warn(`[player] Retrying ${track.id} (${automaticRetry.attempts}/${MAX_AUTOMATIC_RETRIES})`, message);
    await loadAndPlay(track, startAt, true);
    return;
  }

  try {
    await serializeNative(() => TrackPlayer.pause());
  } catch (error) {
    console.warn('[player] Could not pause after exhausting retries', error);
  }
  if (token === loadToken && currentOf(store().queue)?.id === track.id) {
    store().set({ status: 'error', error: message });
  }
}

async function recordHistory(track: Track) {
  try {
    const db = await getDb();
    const s = await settingsRepo.loadSettings(db);
    if (s.historyEnabled) await historyRepo.recordPlay(db, track);
  } catch { /* histórico é best-effort */ }
}

/** Pré-resolve a próxima faixa para que a transição não espere pelo servidor. */
function prefetchNext() {
  const { queue, repeat } = store();
  const i = nextIndex(queue, repeat, false);
  const upcoming = i === null ? null : queue.items[i];
  if (upcoming) void catalog.prefetch(upcoming);
}

/** Fila automática: ao tocar a última faixa, anexa relacionadas (não com repeat "all", que repete a playlist). */
async function maybeFillQueue() {
  const { queue, repeat } = store();
  if (repeat !== 'off') return;
  const cur = currentOf(queue);
  if (!cur || cur.source !== 'youtube') return;
  const related = await catalog.getRelated(cur);
  const now = store().queue;
  if (currentOf(now)?.id !== cur.id) return; // mudou enquanto buscava
  const known = new Set(now.items.map((t) => t.id));
  const fresh = related.filter((t) => !known.has(t.id));
  if (fresh.length) store().set({ queue: appendRecommended(now, fresh) });
}

/** Toca `tracks` a partir de `startIndex`, substituindo a fila. */
export async function playQueue(tracks: Track[], startIndex = 0): Promise<void> {
  const q = setQueue(tracks, startIndex);
  store().set({ queue: q });
  const t = currentOf(q);
  if (t) await loadAndPlay(t);
}

export const playTrack = (track: Track) => playQueue([track], 0);

export async function skipTo(index: number): Promise<void> {
  const { queue } = store();
  if (index < 0 || index >= queue.items.length) return;
  store().set({ queue: { ...queue, index } });
  await loadAndPlay(queue.items[index]);
}

export async function next(manual = true): Promise<void> {
  const { queue, repeat } = store();
  const i = nextIndex(queue, repeat, manual);
  if (i === null) {
    // fim da fila
    const token = ++loadToken;
    try {
      await serializeNative(async () => {
        if (token !== loadToken) return;
        await TrackPlayer.pause();
        if (token === loadToken) await TrackPlayer.seekTo(0);
      });
      if (token === loadToken) store().set({ status: 'paused' });
    } catch (error) {
      if (token === loadToken) store().set({
        status: 'error',
        error: error instanceof Error ? error.message : tr('player.error'),
      });
    }
    return;
  }
  await skipTo(i);
}

export async function previous(): Promise<void> {
  const { queue, repeat } = store();
  const { position } = await TrackPlayer.getProgress().catch(() => ({ position: 0 }));
  if (position > 3) return void (await seekTo(0));
  const i = prevIndex(queue, repeat);
  if (i === null) return void (await seekTo(0));
  await skipTo(i);
}

export async function togglePlay(): Promise<void> {
  const timerEndAt = store().sleepTimerEndsAt;
  if (timerEndAt !== null && Date.now() >= timerEndAt) {
    expireSleepTimer(timerEndAt);
    return;
  }
  const { status, queue } = store();
  if (status === 'error' || status === 'idle') {
    const t = currentOf(queue);
    if (t) await loadAndPlay(t);
    return;
  }
  await serializeNative(async () => {
    const { state } = await TrackPlayer.getPlaybackState();
    if (state === State.Playing || state === State.Buffering || state === State.Loading) await TrackPlayer.pause();
    else await TrackPlayer.play();
  });
}

export const play = () => serializeNative(() => TrackPlayer.play());
export const pause = () => serializeNative(() => TrackPlayer.pause());
export const seekTo = (sec: number) => serializeNative(() => TrackPlayer.seekTo(sec));

export async function stop(): Promise<void> {
  const token = ++loadToken;
  cancelSleepTimer();
  try {
    await serializeNative(async () => {
      if (token === loadToken) await TrackPlayer.reset();
    });
    if (token === loadToken) store().set({ queue: emptyQueue, status: 'idle', error: null });
  } catch (error) {
    if (token === loadToken) store().set({
      status: 'error',
      error: error instanceof Error ? error.message : tr('player.error'),
    });
  }
}

/* --------------------------- fila / opções --------------------------- */

export function addToQueueNext(track: Track) {
  const wasEmpty = store().queue.items.length === 0;
  store().set({ queue: qPlayNext(store().queue, track) });
  if (wasEmpty) void loadAndPlay(track);
  else prefetchNext();
}

export function addToQueueEnd(tracks: Track[]) {
  const wasEmpty = store().queue.items.length === 0;
  store().set({ queue: qEnqueue(store().queue, tracks) });
  if (wasEmpty) void loadAndPlay(tracks[0]);
  else prefetchNext();
}

export async function removeFromQueue(index: number): Promise<void> {
  const { queue } = store();
  const removingCurrent = index === queue.index;
  const q = removeAt(queue, index);
  store().set({ queue: q });
  if (removingCurrent) {
    const t = currentOf(q);
    if (t) await loadAndPlay(t);
    else await stop();
  } else {
    prefetchNext();
  }
}

export function shuffleUpcoming() {
  store().set({ queue: shuffleRest(store().queue) });
  prefetchNext();
}

export async function setRepeat(mode: RepeatMode) {
  store().set({ repeat: mode });
  if (mode !== 'off') store().set({ queue: dropRecommended(store().queue) });
  prefetchNext();
  if (mode === 'off') void maybeFillQueue().catch(() => {}).then(prefetchNext);
  try { await settingsRepo.saveSetting(await getDb(), 'repeatMode', mode); } catch { /* */ }
}

/* ------------------------- eventos do player ------------------------- */

/**
 * Fim da faixa nativa. Um evento atrasado (enquanto a próxima faixa ainda carrega, ou de uma
 * faixa já substituída) não pode avançar a fila de novo, senão a faixa seguinte é pulada.
 */
async function onQueueEnded(event: { track: number; position: number }): Promise<void> {
  const cur = currentOf(store().queue);
  if (!cur
    || store().status === 'loading'
    || queueEndTrackId === cur.id
    || isDuplicateQueueEnd(event, lastQueueEndEvent, Date.now())) return;
  queueEndTrackId = cur.id;
  try {
    const active = await TrackPlayer.getActiveTrack().catch(() => undefined);
    if (currentOf(store().queue)?.id !== cur.id || (active && String(active.id) !== cur.id)) return;
    lastQueueEndEvent = queueEndSignature(event, Date.now());
    await next(false);
  } finally {
    if (queueEndTrackId === cur.id) queueEndTrackId = null;
  }
}

/** Registrado pelo playbackService (roda também em background/headless). */
export function attachPlayerEvents() {
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => { void onQueueEnded(event); });

  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    const cur = store().status;
    if (cur === 'loading' || cur === 'error') {
      if (state === State.Playing) store().set({ status: 'playing' });
      return;
    }
    if (state === State.Playing) store().set({ status: 'playing' });
    else if (state === State.Paused || state === State.Ready) store().set({ status: 'paused' });
    else if (state === State.Buffering || state === State.Loading) store().set({ status: 'buffering' });
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async ({ position }) => {
    checkSleepTimer();
    const retry = automaticRetry;
    if (!retry || position < retry.stableAfterPosition || currentOf(store().queue)?.id !== retry.trackId) return;
    const token = loadToken;
    const active = await TrackPlayer.getActiveTrack().catch(() => undefined);
    if (token === loadToken && active && String(active.id) === retry.trackId && automaticRetry === retry) {
      retry.attempts = 0;
    }
  });

  // URL expirada / falha de rede: re-resolve o stream na mesma posição até ao limite.
  TrackPlayer.addEventListener(Event.PlaybackError, async (e) => {
    console.warn('[player] PlaybackError', e.code, e.message);
    const message = tr('player.errorTrack', { detail: `${e.message ?? ''} (${e.code ?? '?'})` });
    const t = currentOf(store().queue);
    if (!t) return;
    const token = loadToken;
    const active = await TrackPlayer.getActiveTrack().catch(() => undefined);
    if (token !== loadToken || (active && String(active.id) !== t.id)) return;
    const { position } = await TrackPlayer.getProgress().catch(() => ({ position: 0 }));
    await onTrackFailed(t, token, message, position);
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => { void next(true); });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => { void previous(); });
  TrackPlayer.addEventListener(Event.RemotePlay, () => { void togglePlay(); });
  TrackPlayer.addEventListener(Event.RemotePause, () => { void pause(); });
  TrackPlayer.addEventListener(Event.RemoteStop, () => { void stop(); });
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => { void seekTo(position); });
}
