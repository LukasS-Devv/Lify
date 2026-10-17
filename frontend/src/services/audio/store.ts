import { create } from 'zustand';
import type { RepeatMode, Track } from '@/types';
import { emptyQueue, type QueueState } from './queue';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'error';

interface PlayerStore {
  queue: QueueState;
  status: PlayerStatus;
  error: string | null;
  repeat: RepeatMode;
  autoQueue: boolean;
  sleepTimerEndsAt: number | null;
  set: (patch: Partial<Omit<PlayerStore, 'set'>>) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  queue: emptyQueue,
  status: 'idle',
  error: null,
  repeat: 'off',
  autoQueue: true,
  sleepTimerEndsAt: null,
  set: (patch) => set(patch),
}));

export const selectCurrentTrack = (s: PlayerStore): Track | null => s.queue.items[s.queue.index] ?? null;
