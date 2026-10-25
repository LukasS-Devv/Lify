import type { RepeatMode, Track } from '@/types';

/**
 * Lógica pura da fila (sem dependências nativas → testável em Node).
 * `index` aponta para a faixa atual; -1 = fila vazia.
 * `recStart` é o índice da primeira faixa recomendada (fila automática); undefined = nenhuma.
 */
export interface QueueState {
  items: Track[];
  index: number;
  recStart?: number;
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
  return { items, index: q.index, recStart };
}

export function enqueue(q: QueueState, tracks: Track[]): QueueState {
  if (q.items.length === 0) return setQueue(tracks);
  return { items: [...q.items, ...tracks], index: q.index, recStart: q.recStart };
}

/** Anexa faixas recomendadas, marcando onde a seção recomendada começa. */
export function appendRecommended(q: QueueState, tracks: Track[]): QueueState {
  if (tracks.length === 0) return q;
  const recStart = q.recStart ?? q.items.length;
  return { items: [...q.items, ...tracks], index: q.index, recStart };
}

/** Remove as recomendadas que ainda não tocaram (usado ao ligar repeat "all"). */
export function dropRecommended(q: QueueState): QueueState {
  if (q.recStart === undefined || q.index >= q.recStart) return q;
  return { items: q.items.slice(0, q.recStart), index: q.index };
}

export function removeAt(q: QueueState, i: number): QueueState {
  if (i < 0 || i >= q.items.length) return q;
  const items = q.items.filter((_, k) => k !== i);
  if (items.length === 0) return emptyQueue;
  let index = q.index;
  if (i < q.index) index -= 1;
  else if (i === q.index) index = Math.min(index, items.length - 1);
  let recStart = q.recStart;
  if (recStart !== undefined && i < recStart) recStart -= 1;
  if (recStart !== undefined && recStart >= items.length) recStart = undefined;
  return { items, index, recStart };
}

/**
 * Próximo índice respeitando repeat. `manual` = usuário apertou “próxima”.
 * Com repeat "all" a playlist volta ao início e as recomendadas são ignoradas.
 */
export function nextIndex(q: QueueState, repeat: RepeatMode, manual: boolean): number | null {
  if (q.items.length === 0) return null;
  if (repeat === 'one' && !manual) return q.index;
  if (repeat === 'reverse') {
    const limit = q.recStart ?? q.items.length;
    return q.index > 0 && q.index < limit ? q.index - 1 : limit - 1;
  }
  if (repeat === 'all') {
    if (q.recStart !== undefined && q.index >= q.recStart) return 0;
    const limit = q.recStart ?? q.items.length;
    return q.index + 1 < limit ? q.index + 1 : 0;
  }
  return q.index + 1 < q.items.length ? q.index + 1 : null;
}

export function prevIndex(q: QueueState, repeat: RepeatMode): number | null {
  if (q.items.length === 0) return null;
  if (repeat === 'reverse') {
    const limit = q.recStart ?? q.items.length;
    return q.index < limit - 1 ? q.index + 1 : 0;
  }
  if (q.index > 0) return q.index - 1;
  if (repeat !== 'all') return null;
  return (q.recStart || q.items.length) - 1;
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
  return { ...q, items };
}
