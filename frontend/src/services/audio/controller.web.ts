import { catalog } from '@/services/catalog';
import { getDb, historyRepo, settingsRepo } from '@/database';
import type { RepeatMode, Track } from '@/types';
import {
  DownloadedTrackUnavailableError,
  resolveDownloadedTrack,
} from '@/features/downloads';
import {
  appendRecommended,
  currentOf,
  moveQueueItem,
  emptyQueue,
  enqueue as qEnqueue,
  nextIndex,
  playNext as qPlayNext,
  prevIndex,
  removeAt,
  setQueue,
  shuffleRest,
  shuffleAll,
  restoreShuffleOrder,
  shouldFetchRecommendations,
  type QueueState,
} from './queue';
import { usePlayerStore } from './store';
import { t as tr } from '@/i18n';
import { getWebFileUrl } from '@/storage/webFiles';

const store = () => usePlayerStore.getState();
let audioElement: HTMLAudioElement | null = null;
let eventsAttached = false;
let setupPromise: Promise<void> | null = null;
let loadToken = 0;
let sleepTimer: ReturnType<typeof setTimeout> | null = null;
let recommendationRequestTrackId: string | null = null;
const WEB_PLAYER_STORAGE_KEY = 'lify.webPlayer.v1';
let restoredPosition = 0;
let lastPositionPersistAt = 0;

function persistWebQueue(queue = store().queue): void {
  if (typeof window === 'undefined') return;
  try {
    if (queue.items.length === 0) {
      window.localStorage.removeItem(WEB_PLAYER_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(WEB_PLAYER_STORAGE_KEY, JSON.stringify({
      queue,
      position: audioElement?.currentTime || restoredPosition,
    }));
  } catch {
    // O armazenamento pode estar indisponível em navegação privada.
  }
}

function isTrack(value: unknown): value is Track {
  if (!value || typeof value !== 'object') return false;
  const track = value as Partial<Track>;
  return typeof track.id === 'string'
    && (track.source === 'youtube' || track.source === 'local')
    && typeof track.sourceId === 'string'
    && typeof track.title === 'string'
    && typeof track.artist === 'string'
    && (typeof track.album === 'string' || track.album === null)
    && (typeof track.durationSec === 'number' || track.durationSec === null)
    && typeof track.artworkUrl === 'string';
}

function restoreWebQueue(): void {
  if (typeof window === 'undefined' || store().queue.items.length > 0) return;
  try {
    const raw = window.localStorage.getItem(WEB_PLAYER_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { queue?: Partial<QueueState>; position?: number };
    const items = saved.queue?.items;
    const index = saved.queue?.index;
    if (!Array.isArray(items) || !items.every(isTrack)
      || !Number.isInteger(index) || index === undefined || index < 0 || index >= items.length) {
      window.localStorage.removeItem(WEB_PLAYER_STORAGE_KEY);
      return;
    }
    const queue: QueueState = { items, index };
    const recStart = saved.queue?.recStart;
    if (Number.isInteger(recStart) && recStart !== undefined && recStart >= 0 && recStart < items.length) {
      queue.recStart = recStart;
    }
    restoredPosition = Number.isFinite(saved.position) ? Math.max(0, saved.position ?? 0) : 0;
    store().set({ queue, status: 'paused', error: null });
  } catch {
    window.localStorage.removeItem(WEB_PLAYER_STORAGE_KEY);
  }
}

usePlayerStore.subscribe((state, previous) => {
  if (state.queue !== previous.queue) persistWebQueue(state.queue);
});

export function getWebAudioElement(): HTMLAudioElement {
  return getAudio();
}

function getAudio(): HTMLAudioElement {
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.preload = 'auto';
  }
  attachAudioEvents();
  return audioElement;
}

function attachAudioEvents(): void {
  if (eventsAttached) return;
  eventsAttached = true;
  const audio = audioElement!;
  audio.addEventListener('play', () => store().set({ status: 'playing', error: null }));
  audio.addEventListener('pause', () => {
    if (!audio.ended && currentOf(store().queue)
      && store().status !== 'loading' && store().status !== 'error') {
      store().set({ status: 'paused' });
    }
  });
  audio.addEventListener('waiting', () => {
    if (store().status === 'playing') store().set({ status: 'buffering' });
  });
  audio.addEventListener('playing', () => store().set({ status: 'playing', error: null }));
  audio.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastPositionPersistAt < 5000) return;
    lastPositionPersistAt = now;
    persistWebQueue();
  });
  audio.addEventListener('ended', () => { void onAudioEnded(); });
  audio.addEventListener('error', () => {
    if (store().status !== 'loading') {
      store().set({ status: 'error', error: tr('player.error') });
    }
  });
}

export function setSleepTimer(minutes: number): void {
  if (!Number.isSafeInteger(minutes) || minutes <= 0 || !Number.isSafeInteger(Date.now() + minutes * 60_000)) {
    throw new RangeError('Sleep timer duration must be a positive, safe integer number of minutes.');
  }
  cancelSleepTimer();
  const endAt = Date.now() + minutes * 60_000;
  store().set({ sleepTimerEndsAt: endAt, sleepTimerPreset: minutes });
  const checkTimer = () => {
    if (store().sleepTimerEndsAt !== endAt) return;
    const remaining = endAt - Date.now();
    if (remaining > 0) {
      sleepTimer = setTimeout(checkTimer, Math.min(remaining, 2_147_000_000));
      return;
    }
    sleepTimer = null;
    getAudio().pause();
    store().set({ sleepTimerEndsAt: null, sleepTimerPreset: null, status: 'paused' });
  };
  checkTimer();
}

export function setSleepTimerAtTrackEnd(): void {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = null;
  store().set({ sleepTimerEndsAt: null, sleepTimerPreset: 'trackEnd' });
}

export function cancelSleepTimer(): void {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = null;
  store().set({ sleepTimerEndsAt: null, sleepTimerPreset: null });
}

export function setupAudio(): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      const settings = await settingsRepo.loadSettings(await getDb());
      store().set({ repeat: settings.repeatMode });
      getAudio();
    })().catch((error: unknown) => {
      setupPromise = null;
      throw error;
    });
  }
  return setupPromise;
}

export async function restoreNativeQueue(): Promise<void> {
  await setupAudio();
  restoreWebQueue();
  requestRecommendationsIfEnabled();
}

async function recordHistory(track: Track): Promise<void> {
  const db = await getDb();
  const settings = await settingsRepo.loadSettings(db);
  if (settings.historyEnabled) await historyRepo.recordPlay(db, track);
}

function prefetchNext(): void {
  const { queue, repeat } = store();
  const index = nextIndex(queue, repeat, false);
  const track = index === null ? null : queue.items[index];
  if (track) void catalog.prefetch(track);
}

async function maybeFillQueue(): Promise<void> {
  const { queue, repeat } = store();
  const track = currentOf(queue);
  if ((repeat !== 'off' && repeat !== 'all') || queue.recStart !== undefined || !track || track.source !== 'youtube') return;
  if (recommendationRequestTrackId === track.id) return;
  recommendationRequestTrackId = track.id;
  try {
    const related = await catalog.getRelated(track);
    const current = store();
    if ((current.repeat !== 'off' && current.repeat !== 'all')
      || current.queue.recStart !== undefined
      || currentOf(current.queue)?.id !== track.id) return;
    const known = new Set(current.queue.items.map((item) => item.id));
    const fresh = related.filter((item) => !known.has(item.id));
    if (fresh.length) store().set({ queue: appendRecommended(current.queue, fresh) });
  } finally {
    if (recommendationRequestTrackId === track.id) recommendationRequestTrackId = null;
  }
}

function requestRecommendationsIfEnabled(): void {
  const { repeat } = store();
  if (repeat === 'off' || repeat === 'all') void maybeFillQueue().catch(() => {});
}

async function loadAndPlay(track: Track, startAt = 0): Promise<void> {
  const token = ++loadToken;
  store().set({ status: 'loading', error: null });
  try {
    await setupAudio();
    const downloaded = track.source === 'youtube' ? await resolveDownloadedTrack(track.id) : null;
    let stream: { url: string; mimeType: string | null };
    if (downloaded) {
      stream = { url: downloaded.uri, mimeType: downloaded.mimeType };
    } else if (track.source === 'local' && track.sourceId.startsWith('web-audio:')) {
      const localUrl = await getWebFileUrl(track.sourceId);
      if (!localUrl) throw new Error(tr('downloads.fileMissing'));
      stream = { url: localUrl, mimeType: null };
    } else if (track.source === 'local') {
      stream = { url: track.sourceId, mimeType: null };
    } else {
      stream = await catalog.getStream(track);
    }
    if (token !== loadToken) return;

    const audio = getAudio();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.src = stream.url;
    audio.load();
    await new Promise<void>((resolve, reject) => {
      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        resolve();
        return;
      }
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error(tr('player.error')));
      };
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onReady);
        audio.removeEventListener('error', onError);
      };
      audio.addEventListener('loadedmetadata', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
    });
    if (token !== loadToken) return;
    if (startAt > 0) audio.currentTime = startAt;
    await audio.play();
    if (token !== loadToken) return;
    void recordHistory(track).catch((error: unknown) => {
      console.warn('[history] Could not record playback', error);
    });
    prefetchNext();
  } catch (error) {
    if (token !== loadToken) return;
    const message = error instanceof DownloadedTrackUnavailableError
      ? error.message
      : error instanceof Error ? error.message : tr('player.error');
    store().set({ status: 'error', error: message });
  }
}

export async function playQueue(tracks: Track[], startIndex = 0, shuffle?: boolean): Promise<void> {
  const enabled = shuffle ?? store().shuffle;
  let queue = setQueue(tracks, startIndex);
  if (shuffle === true) queue = shuffleAll(queue);
  else if (enabled) queue = shuffleRest(queue);
  store().set({ queue, shuffle: enabled });
  requestRecommendationsIfEnabled();
  const track = currentOf(queue);
  if (track) await loadAndPlay(track);
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
  const index = nextIndex(queue, repeat, manual);
  if (index === null) {
    ++loadToken;
    getAudio().pause();
    getAudio().currentTime = 0;
    store().set({ status: 'paused' });
    return;
  }
  await skipTo(index);
}

export async function previous(): Promise<void> {
  const audio = getAudio();
  const { queue, repeat } = store();
  if (audio.currentTime > 3) {
    await seekTo(0);
    return;
  }
  const index = prevIndex(queue, repeat);
  if (index === null) {
    await seekTo(0);
    return;
  }
  await skipTo(index);
}

export async function togglePlay(): Promise<void> {
  const timerEndAt = store().sleepTimerEndsAt;
  if (timerEndAt !== null && Date.now() >= timerEndAt) {
    getAudio().pause();
    store().set({ sleepTimerEndsAt: null, sleepTimerPreset: null, status: 'paused' });
    return;
  }
  const { status, queue } = store();
  if (status === 'loading' || status === 'buffering') return;
  const audio = getAudio();
  if (status === 'paused' && !audio.currentSrc) {
    const track = currentOf(queue);
    if (track) {
      const position = restoredPosition;
      restoredPosition = 0;
      await loadAndPlay(track, position);
    }
    return;
  }
  if (status === 'error' || status === 'idle') {
    const track = currentOf(queue);
    if (track) await loadAndPlay(track, getAudio().currentTime || 0);
    return;
  }
  if (getAudio().paused) {
    try {
      await getAudio().play();
    } catch (error) {
      store().set({ status: 'error', error: error instanceof Error ? error.message : tr('player.error') });
    }
  } else {
    getAudio().pause();
  }
}

export const play = async () => getAudio().play();
export const pause = async () => { getAudio().pause(); };
export const seekTo = async (seconds: number) => {
  if (Number.isFinite(seconds)) getAudio().currentTime = Math.max(0, seconds);
};

export async function stop(): Promise<void> {
  ++loadToken;
  cancelSleepTimer();
  const audio = getAudio();
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  store().set({ queue: emptyQueue, status: 'idle', error: null });
}

export function addToQueueNext(track: Track): void {
  const wasEmpty = store().queue.items.length === 0;
  store().set({ queue: qPlayNext(store().queue, track) });
  requestRecommendationsIfEnabled();
  if (wasEmpty) void loadAndPlay(track);
  else prefetchNext();
}

export function addToQueueEnd(tracks: Track[]): void {
  const wasEmpty = store().queue.items.length === 0;
  store().set({ queue: qEnqueue(store().queue, tracks) });
  requestRecommendationsIfEnabled();
  if (wasEmpty && tracks[0]) void loadAndPlay(tracks[0]);
  else prefetchNext();
}

export async function removeFromQueue(index: number): Promise<void> {
  const { queue } = store();
  const removingCurrent = index === queue.index;
  const nextQueue = removeAt(queue, index);
  store().set({ queue: nextQueue });
  if (removingCurrent) {
    const track = currentOf(nextQueue);
    if (track) await loadAndPlay(track);
    else await stop();
  } else {
    prefetchNext();
  }
}

export async function reorderQueue(from: number, to: number): Promise<void> {
  const queue = store().queue;
  const nextQueue = moveQueueItem(queue, from, to);
  if (nextQueue === queue) return;
  store().set({ queue: nextQueue });
  prefetchNext();
}

export function toggleShuffle(): void {
  const { queue, shuffle } = store();
  store().set({
    queue: shuffle ? restoreShuffleOrder(queue) : shuffleRest(queue),
    shuffle: !shuffle,
  });
  prefetchNext();
}

export async function setRepeat(mode: RepeatMode): Promise<void> {
  store().set({ repeat: mode });
  requestRecommendationsIfEnabled();
  prefetchNext();
  try {
    await settingsRepo.saveSetting(await getDb(), 'repeatMode', mode);
  } catch (error) {
    console.warn('[settings] Could not save repeat mode', error);
  }
}

async function onAudioEnded(): Promise<void> {
  const track = currentOf(store().queue);
  if (!track) return;
  if (store().sleepTimerPreset === 'trackEnd') {
    store().set({ sleepTimerEndsAt: null, sleepTimerPreset: null, status: 'paused' });
    return;
  }
  if (store().repeat === 'one') {
    const audio = getAudio();
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch (error) {
      store().set({ status: 'error', error: error instanceof Error ? error.message : tr('player.error') });
    }
    return;
  }
  if (shouldFetchRecommendations(store().queue, store().repeat)) {
    await maybeFillQueue().catch((error: unknown) => {
      console.warn('[catalog] Could not load recommended tracks', error);
    });
    if (currentOf(store().queue)?.id !== track.id) return;
  }
  await next(false);
}

export function attachPlayerEvents(): void {
  attachAudioEvents();
}
