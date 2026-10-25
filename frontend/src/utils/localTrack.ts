import type { Track } from '@/types';

export function createLocalTrack(id: string, uri: string, fileName: string): Track {
  const name = fileName.split(/[\\/]/).pop() ?? fileName;
  const title = name.replace(/\.[^.]+$/, '').trim();
  return {
    id: `local:${id}`,
    source: 'local',
    sourceId: uri,
    title: title || fileName,
    artist: '',
    album: null,
    durationSec: null,
    artworkUrl: '',
  };
}
