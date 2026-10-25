import type { PlaybackQueueEndedEvent } from 'react-native-track-player';

const DUPLICATE_EVENT_WINDOW_MS = 5_000;

export interface QueueEndSignature {
  track: number;
  position: number;
  receivedAt: number;
}

export function isDuplicateQueueEnd(
  event: PlaybackQueueEndedEvent,
  previous: QueueEndSignature | null,
  now: number,
): boolean {
  if (!previous || now - previous.receivedAt > DUPLICATE_EVENT_WINDOW_MS) return false;
  return event.track === previous.track
    && Math.round(event.position) === Math.round(previous.position);
}

export function queueEndSignature(event: PlaybackQueueEndedEvent, receivedAt: number): QueueEndSignature {
  return { track: event.track, position: event.position, receivedAt };
}
