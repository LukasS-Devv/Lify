import type { RepeatMode, Track } from '@/types';
import { moveItem } from '@/utils/moveItem';

/**
 * Lógica pura da fila (sem dependências nativas → testável em Node).
 * `index` aponta para a faixa atual; -1 = fila vazia.
 * `recStart` é o índice da primeira faixa recomendada (fila automática); undefined = nenhuma.
 */
export interface QueueState {
  items: Track[];
  index: number;
  recStart?: number;
  shuffleSource?: Track[];
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
  const recStart = q.recStart !== undefined && q.index + 1 <= q.recStart ? q.recStart + 1 : q.recStart;
  const shuffleSource = q.shuffleSource && [...q.shuffleSource];
  if (shuffleSource) {
    const sourceIndex = sourceIndexForItem(q, q.index);
    if (sourceIndex >= 0) shuffleSource.splice(sourceIndex + 1, 0, track);
  }
  return { items, index: q.index, recStart, shuffleSource };
}

export function enqueue(q: QueueState, tracks: Track[]): QueueState {
  if (q.items.length === 0) return setQueue(tracks);
  return {
    items: [...q.items, ...tracks],
    index: q.index,
    recStart: q.recStart,
    shuffleSource: q.shuffleSource ? [...q.shuffleSource, ...tracks] : undefined,
  };
}

/** Anexa faixas recomendadas, marcando onde a seção recomendada começa. */
export function appendRecommended(q: QueueState, tracks: Track[]): QueueState {
  if (tracks.length === 0) return q;
  const recStart = q.recStart ?? q.items.length;
  return {
    items: [...q.items, ...tracks],
    index: q.index,
    recStart,
    shuffleSource: q.shuffleSource ? [...q.shuffleSource, ...tracks] : undefined,
  };
}

/** Remove as recomendadas que ainda não tocaram (usado ao ligar repeat "all"). */
export function dropRecommended(q: QueueState): QueueState {
  if (q.recStart === undefined || q.index >= q.recStart) return q;
  return {
    items: q.items.slice(0, q.recStart),
    index: q.index,
    shuffleSource: q.shuffleSource?.slice(0, q.recStart),
  };
}

export function removeAt(q: QueueState, i: number): QueueState {
  if (i < 0 || i >= q.items.length) return q;
  const items = q.items.filter((_, k) => k !== i);
  if (items.length === 0) return emptyQueue;
  const shuffleSource = q.shuffleSource && [...q.shuffleSource];
  if (shuffleSource) {
    const sourceIndex = sourceIndexForItem(q, i);
    if (sourceIndex >= 0) shuffleSource.splice(sourceIndex, 1);
  }
  let index = q.index;
  if (i < q.index) index -= 1;
  else if (i === q.index) index = Math.min(index, items.length - 1);
  let recStart = q.recStart;
  if (recStart !== undefined && i < recStart) recStart -= 1;
  if (recStart !== undefined && recStart >= items.length) recStart = undefined;
  return { items, index, recStart, shuffleSource };
}

export function moveQueueItem(q: QueueState, from: number, to: number): QueueState {
  if (from < 0 || from >= q.items.length || to < 0 || to >= q.items.length || from === to) return q;
  const index = moveIndex(q.index, from, to);
  let recStart = q.recStart;
  if (recStart !== undefined) {
    if (from < recStart && to >= recStart) recStart -= 1;
    else if (from >= recStart && to < recStart) recStart += 1;
  }
  const next: QueueState = { items: moveItem(q.items, from, to), index };
  if (recStart !== undefined) next.recStart = recStart;
  return next;
}

function moveIndex(index: number, from: number, to: number): number {
  if (index === from) return to;
  if (from < index && to >= index) return index - 1;
  if (from > index && to <= index) return index + 1;
  return index;
}

/**
 * Próximo índice respeitando repeat. `manual` = usuário apertou “próxima”.
 * Com repeat "all" a playlist toca primeiro, segue para sugestões e volta ao início.
 */
export function nextIndex(q: QueueState, repeat: RepeatMode, manual: boolean): number | null {
  if (q.items.length === 0) return null;
  if (repeat === 'one' && !manual) return q.index;
  if (repeat === 'reverse') {
    const limit = q.recStart ?? q.items.length;
    return q.index > 0 && q.index < limit ? q.index - 1 : limit - 1;
  }
  if (repeat === 'all') {
    return q.index + 1 < q.items.length ? q.index + 1 : 0;
  }
  if (repeat === 'one' && manual && q.index === q.items.length - 1) return q.index;
  return q.index + 1 < q.items.length ? q.index + 1 : null;
}

export function shouldFetchRecommendations(q: QueueState, repeat: RepeatMode): boolean {
  return (repeat === 'off' || repeat === 'all')
    && q.recStart === undefined
    && currentOf(q)?.source === 'youtube'
    && q.index === q.items.length - 1;
}

export function prevIndex(q: QueueState, repeat: RepeatMode): number | null {
  if (q.items.length === 0) return null;
  if (repeat === 'reverse') {
    const limit = q.recStart ?? q.items.length;
    return q.index < limit - 1 ? q.index + 1 : 0;
  }
  if (q.index > 0) return q.index - 1;
  if (repeat !== 'all') return null;
  return q.items.length - 1;
}

/** Embaralha as faixas seguintes sem misturar playlist e recomendadas. */
export function shuffleRest(q: QueueState, rng: () => number = Math.random): QueueState {
  if (q.index < 0) return q;
  const items = [...q.items];
  const boundary = q.recStart ?? items.length;
  const segments: [number, number][] = [
    [q.index + 1, boundary],
    [Math.max(q.index + 1, boundary), items.length],
  ];
  for (const [from, to] of segments) {
    for (let i = to - 1; i > from; i--) {
      const j = from + Math.floor(rng() * (i - from + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }
  return { ...q, items, shuffleSource: q.shuffleSource ?? [...q.items] };
}

export function shuffleAll(q: QueueState, rng: () => number = Math.random): QueueState {
  if (q.items.length === 0) return q;
  const items = [...q.items];
  const boundary = q.recStart ?? items.length;
  const segments: [number, number][] = [[0, boundary], [boundary, items.length]];
  for (const [from, to] of segments) {
    for (let i = to - 1; i > from; i--) {
      const j = from + Math.floor(rng() * (i - from + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }
  return { ...q, items, index: 0, shuffleSource: q.shuffleSource ?? [...q.items] };
}

export function restoreShuffleOrder(q: QueueState): QueueState {
  if (!q.shuffleSource) return q;
  const index = sourceIndexForItem(q, q.index);
  return {
    ...q,
    items: [...q.shuffleSource],
    index: Math.max(index, 0),
    shuffleSource: undefined,
  };
}

function sourceIndexForItem(q: QueueState, itemIndex: number): number {
  const source = q.shuffleSource;
  const item = q.items[itemIndex];
  if (!source || !item) return -1;
  let occurrence = 0;
  for (let i = 0; i < itemIndex; i++) {
    if (q.items[i] === item) occurrence += 1;
  }
  for (let i = 0; i < source.length; i++) {
    if (source[i] === item) {
      if (occurrence === 0) return i;
      occurrence -= 1;
    }
  }
  return -1;
}
