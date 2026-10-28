import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavoriteFeedbackStore } from '@/features/favorites/favoriteFeedback';
import { t, useTranslation } from '@/i18n';
import { colors, font, layout, radius, shadow, spacing } from '@/theme/tokens';
import { Icon } from './Icon';
import { PlaylistPickerModal } from './PlaylistPickerModal';
import { Toast } from './Overlays';

const AUTO_HIDE_MS = 3000;
/** Altura aproximada da barra global + mini player, para o banner ficar acima deles. */
const LIFT = 72 + layout.miniPlayerHeight + spacing.sm * 2;

/** Banner no rodapé após favoritar, com atalho para alterar as playlists da faixa. */
export function FavoriteToast({ lifted = false }: { lifted?: boolean }) {
  useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const track = useFavoriteFeedbackStore((s) => s.track);
  const nonce = useFavoriteFeedbackStore((s) => s.nonce);
  const pickerOpen = useFavoriteFeedbackStore((s) => s.pickerOpen);
  const hide = useFavoriteFeedbackStore((s) => s.hide);
  const setPickerOpen = useFavoriteFeedbackStore((s) => s.setPickerOpen);

  useEffect(() => {
    if (!track || pickerOpen) return;
    const timer = setTimeout(hide, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [track, nonce, pickerOpen, hide]);

  if (!track) return null;

  return (
    <>
      <View pointerEvents="box-none" style={[s.wrap, { bottom: insets.bottom + (lifted ? LIFT : spacing.md) }]}>
        <Toast style={[s.banner, shadow.card]}>
          <Icon name="heart" size={20} color={colors.accent} />
          <Text numberOfLines={2} style={s.text}>{t('favorite.added')}</Text>
          <Pressable accessibilityRole="button" onPress={() => setPickerOpen(true)} hitSlop={8} style={s.action}>
            <Text style={s.actionText}>{t('favorite.change')}</Text>
          </Pressable>
        </Toast>
      </View>
      {pickerOpen ? (
        <PlaylistPickerModal
          track={track}
          onCancel={() => setPickerOpen(false)}
          onConfirm={() => { setPickerOpen(false); hide(); }}
          onCreatePlaylist={() => {
            setPickerOpen(false);
            router.push('/playlists');
          }}
        />
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  text: { flex: 1, color: colors.text, fontSize: font.md, fontWeight: '600' },
  action: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  actionText: { color: colors.accent, fontSize: font.md, fontWeight: '800' },
});
