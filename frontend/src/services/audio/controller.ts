import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
} from 'react-native-track-player';
import { catalog } from '@/services/catalog';
import { getDb, historyRepo, settingsRepo } from '@/database';
import type { RepeatMode, Track } from '@/types';
import {
  currentOf, enqueue as qEnqueue, nextIndex, playNext as qPlayNext, prevIndex,
  removeAt, setQueue, shuffleRest, emptyQueue,
} from './queue';
import { usePlayerStore } from './store';
import { t as tr } from '@/i18n';

const store = () => usePlayerStore.getState();
let setupDone: Promise<void> | null = null;
let retriedFor: string | null = null; // faixa que já teve 1 retry automático
let lastNativeError = '';
let loadToken = 0; // invalida carregamentos antigos quando o usuário pula rápido
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

  sleepTimer = null;
  if (store().sleepTimerEndsAt !== endAt) return;
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
      const dataSaver = settings.playbackMode === 'dataSaver';
      try {
        await TrackPlayer.setupPlayer({
          autoHandleInterruptions: true,
          minBuffer: dataSaver ? 5 : 30,
          maxBuffer: dataSaver ? 15 : 30,
          playBuffer: 3,
          backBuffer: 0,
        });
      } catch (e) {
        // "already initialized" ao recarregar em dev
        if (!(e instanceof Error) || !/already been initialized/i.test(e.message)) throw e;
      }
      store().set({ repeat: settings.repeatMode, autoQueue: settings.autoQueue });
      await TrackPlayer.updateOptions({
        android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification },
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

/* ---------------------------- reprodução ---------------------------- */

async function loadAndPlay(track: Track, startAt = 0, isRetry = false): Promise<void> {
  const token = ++loadToken;
  if (!isRetry) retriedFor = null;
  store().set({ status: 'loading', error: null });
  try {
    await setupAudio();
    const stream = await catalog.getStream(track);
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
        artist: track.artist,
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
      void maybeFillQueue();
    }
  } catch (e) {
    if (token !== loadToken) return;
    store().set({ status: 'error', error: e instanceof Error ? e.message : tr('player.error') });
  }
}

async function recordHistory(track: Track) {
  try {
    const db = await getDb();
    const s = await settingsRepo.loadSettings(db);
    if (s.historyEnabled) await historyRepo.recordPlay(db, track);
  } catch { /* histórico é best-effort */ }
}

/** Fila automática: ao tocar a última faixa, anexa relacionadas. */
async function maybeFillQueue() {
  const { queue, autoQueue } = store();
  if (!autoQueue || queue.index < queue.items.length - 1) return;
  const cur = currentOf(queue);
  if (!cur) return;
  const related = await catalog.getRelated(cur);
  const now = store().queue;
  if (currentOf(now)?.id !== cur.id) return; // mudou enquanto buscava
  const known = new Set(now.items.map((t) => t.id));
  const fresh = related.filter((t) => !known.has(t.id));
  if (fresh.length) store().set({ queue: qEnqueue(now, fresh) });
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
}

export function addToQueueEnd(tracks: Track[]) {
  const wasEmpty = store().queue.items.length === 0;
  store().set({ queue: qEnqueue(store().queue, tracks) });
  if (wasEmpty) void loadAndPlay(tracks[0]);
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
  }
}

export function shuffleUpcoming() {
  store().set({ queue: shuffleRest(store().queue) });
}

export async function setRepeat(mode: RepeatMode) {
  store().set({ repeat: mode });
  try { await settingsRepo.saveSetting(await getDb(), 'repeatMode', mode); } catch { /* */ }
}

export async function setAutoQueue(on: boolean) {
  store().set({ autoQueue: on });
  try { await settingsRepo.saveSetting(await getDb(), 'autoQueue', on); } catch { /* */ }
  if (on) void maybeFillQueue();
}

/* ------------------------- eventos do player ------------------------- */

/** Registrado pelo playbackService (roda também em background/headless). */
export function attachPlayerEvents() {
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => { void next(false); });

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

  // URL expirada / falha de rede: tenta uma vez re-resolver o stream na mesma posição.
  TrackPlayer.addEventListener(Event.PlaybackError, async (e) => {
    console.warn('[player] PlaybackError', e.code, e.message);
    lastNativeError = `${e.message ?? ''} (${e.code ?? '?'})`;
    const t = currentOf(store().queue);
    if (!t) return;
    if (retriedFor !== t.id) {
      retriedFor = t.id;
      const { position } = await TrackPlayer.getProgress().catch(() => ({ position: 0 }));
      await loadAndPlay(t, position, true);
    } else {
      store().set({ status: 'error', error: tr('player.errorTrack', { detail: lastNativeError }) });
    }
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => { void next(true); });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => { void previous(); });
  TrackPlayer.addEventListener(Event.RemotePlay, () => { void play(); });
  TrackPlayer.addEventListener(Event.RemotePause, () => { void pause(); });
  TrackPlayer.addEventListener(Event.RemoteStop, () => { void stop(); });
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => { void seekTo(position); });
}
