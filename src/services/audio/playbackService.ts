import { attachPlayerEvents } from './controller';

/** Serviço registrado em index.ts via TrackPlayer.registerPlaybackService. */
export async function playbackService() {
  attachPlayerEvents();
}
