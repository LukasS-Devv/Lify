import { useLocalSearchParams } from 'expo-router';
import { Library } from '@/components/spotify-clone';
import type { LibraryCategory } from '@/components/spotify-clone/LibraryRelated';
import { useTranslation } from '@/i18n';

const CATEGORIES: LibraryCategory[] = ['favorites', 'history', 'playlists'];

export default function LibraryTab() {
  useTranslation();
  const { category, nonce } = useLocalSearchParams<{ category?: string; nonce?: string }>();
  const openCategory = CATEGORIES.find((value) => value === category);
  return <Library openCategory={openCategory} openNonce={nonce} />;
}
