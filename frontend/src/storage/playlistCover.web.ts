import { t } from '@/i18n';
import { pickWebFiles } from './webFiles';

export async function pickPlaylistCover(): Promise<string | null> {
  const [file] = await pickWebFiles('image/*');
  if (!file) return null;
  if (file.size > 10 * 1024 * 1024) throw new Error(t('playlist.coverTooLarge'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error(t('playlist.coverPickFailed')));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error(t('playlist.coverPickFailed')));
    reader.readAsDataURL(file);
  });
}
