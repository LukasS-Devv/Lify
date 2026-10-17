import { Library } from '@/components/spotify-clone';
import { useTranslation } from '@/i18n';

export default function LibraryTab() {
  useTranslation();
  return <Library />;
}
