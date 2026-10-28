import { useEffect, useState } from 'react';
import { getWebAudioElement } from './controller.web';

export function useProgress(interval = 1000): { position: number; duration: number } {
  const [progress, setProgress] = useState({ position: 0, duration: 0 });
  useEffect(() => {
    const audio = getWebAudioElement();
    const update = () => setProgress({
      position: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
    });
    update();
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', update);
    const timer = window.setInterval(update, interval);
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('loadedmetadata', update);
      window.clearInterval(timer);
    };
  }, [interval]);
  return progress;
}
