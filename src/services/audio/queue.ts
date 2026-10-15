import type { RepeatMode, Track } from '@/types';

/**
 * Lógica pura da fila (sem dependências nativas → testável em Node).
 * `index` aponta para a faixa atual; -1 = fila vazia.
 */
export interface QueueState {
  items: Track[];
  index: number;
}

export const emptyQueue: QueueState = { items: [], index: -1 };

export const currentOf = (q: QueueState): Track | null => q.items[q.index] ?? null;

export function setQueue(items: Track[], startIndex = 0): QueueState {
  if (items.length === 0) return emptyQueue;
  return { items: [...items], index: Math.min(Math.max(startIndex, 0), items.length - 1) };
}

/** Insere logo após a faixa atual (“tocar a seguir”). */
export function playNext(q: QueueState, track: Track): QueueState {
  if (q.items.length === 0) return setQueue([track]);
  const items = [...q.items];
  items.splice(q.index + 1, 0, track);
  return { items, index: q.index };
}

export function enqueue(q: QueueState, tracks: Track[]): QueueState {
  if (q.items.length === 0) return setQueue(tracks);
  return { items: [...q.items, ...tracks], index: q.index };
}

export function removeAt(q: QueueState, i: number): QueueState {
  if (i < 0 || i >= q.items.length) return q;
  const items = q.items.filter((_, k) => k !== i);
  if (items.length === 0) return emptyQueue;
  let index = q.index;
  if (i < q.index) index -= 1;
  else if (i === q.index) index = Math.min(index, items.length - 1);
  return { items, index };
}

/** Próximo índice respeitando repeat. `manual` = usuário apertou “próxima”. */
export function nextIndex(q: QueueState, repeat: RepeatMode, manual: boolean): number | null {
  if (q.items.length === 0) return null;
  if (repeat === 'one' && !manual) return q.index;
  if (q.index + 1 < q.items.length) return q.index + 1;
  return repeat === 'all' ? 0 : null;
}

export function prevIndex(q: QueueState, repeat: RepeatMode): number | null {
  if (q.items.length === 0) return null;
  if (q.index > 0) return q.index - 1;
  return repeat === 'all' ? q.items.length - 1 : null;
}

export function shuffleRest(q: QueueState, rng: () => number = Math.random): QueueState {
  if (q.index < 0) return q;
  const head = q.items.slice(0, q.index + 1);
  const rest = q.items.slice(q.index + 1);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return { items: [...head, ...rest], index: q.index };
}
