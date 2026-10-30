import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useFavoriteFeedbackStore } from '@/features/favorites/favoriteFeedback';
import { t, useTranslation } from '@/i18n';
import { showToast } from './overlay';
import { PlaylistPickerModal } from './PlaylistPickerModal';

const AUTO_HIDE_MS = 3000;

/** Liga a confirmação de favorito ao ToastHost e mantém o atalho para editar playlists. */
export function FavoriteToast({ lifted = false }: { lifted?: boolean }) {
  useTranslation();
  const router = useRouter();
  const track = useFavoriteFeedbackStore((s) => s.track);
  const nonce = useFavoriteFeedbackStore((s) => s.nonce);
  const pickerOpen = useFavoriteFeedbackStore((s) => s.pickerOpen);
  const hide = useFavoriteFeedbackStore((s) => s.hide);
  const setPickerOpen = useFavoriteFeedbackStore((s) => s.setPickerOpen);

  useEffect(() => {
    if (!track || pickerOpen) return;
    showToast(t('favorite.added'), {
      icon: 'heart',
      actionLabel: t('favorite.change'),
      onAction: () => setPickerOpen(true),
      lifted,
    });
    const timer = setTimeout(hide, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [track, nonce, pickerOpen, hide, lifted, setPickerOpen]);

  return (
    pickerOpen && track ? (
        <PlaylistPickerModal
          track={track}
          onCancel={() => setPickerOpen(false)}
          onConfirm={() => { setPickerOpen(false); hide(); }}
          onCreatePlaylist={() => {
            setPickerOpen(false);
            router.push('/playlists');
          }}
        />
    ) : null
  );
}
