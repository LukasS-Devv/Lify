import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { Button, Icon, IconButton } from '@/components';
import { Header } from '@/components/spotify-clone';
import { usePlaylists } from '@/features/playlists/usePlaylists';
import { t, useTranslation } from '@/i18n';
import { colors, font, layout, radius, spacing } from '@/theme/tokens';

export default function CreatePlaylist() {
  useTranslation();
  const router = useRouter();
  const { create } = usePlaylists();
  const [name, setName] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectCover = async () => {
    setFormError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error(t('playlist.coverPickFailed'));

      const extension = asset.name?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? 'jpg';
      const directory = new Directory(Paths.document, 'playlist-covers');
      directory.create({ intermediates: true, idempotent: true });
      const savedFile = new File(directory, `playlist-${Date.now()}.${extension}`);
      await new File(asset.uri).copy(savedFile);
      setCoverUrl(savedFile.uri);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('common.error'));
    }
  };

  const submit = async () => {
    if (creating) return;
    setCreating(true);
    setFormError(null);
    try {
      const id = await create(name, coverUrl);
      router.replace({ pathname: '/playlist/[id]', params: { id: String(id) } });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={s.root}>
      <Header
        title={t('playlist.newTitle')}
        right={<IconButton icon="close" label={t('common.close')} onPress={() => router.back()} />}
      />
      <KeyboardAvoidingView style={s.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.prompt}>{t('playlist.createPrompt')}</Text>
          <Text style={s.hint}>{t('playlist.createHint')}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={coverUrl ? t('playlist.changeCover') : t('playlist.addCover')}
            onPress={() => void selectCover()}
            style={({ pressed }) => [s.coverButton, pressed && s.pressed]}
          >
            {coverUrl
              ? <Image source={{ uri: coverUrl }} style={s.cover} />
              : (
                <View style={[s.cover, s.coverPlaceholder]}>
                  <Icon name="musical-notes" size={32} color={colors.textMuted} />
                </View>
              )}
            <View style={s.coverEdit}>
              <Icon name="camera" size={18} color={colors.text} />
            </View>
          </Pressable>
          <Text style={s.coverLabel}>{coverUrl ? t('playlist.changeCover') : t('playlist.addCover')}</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            editable={!creating}
            placeholder={t('playlist.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            maxLength={100}
            style={s.input}
          />
          {formError ? <Text accessibilityRole="alert" style={s.error}>{formError}</Text> : null}
        </ScrollView>
        <View style={s.footer}>
          <Button label={t('common.create')} onPress={submit} loading={creating} disabled={!name.trim()} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  prompt: { color: colors.text, fontSize: font.xl, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  hint: { color: colors.textMuted, fontSize: font.md, lineHeight: 21, textAlign: 'center', marginTop: spacing.xs },
  coverButton: { position: 'relative', marginTop: spacing.xl },
  cover: { width: 110, height: 110, borderRadius: radius.sm },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  coverEdit: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  coverLabel: { color: colors.textMuted, fontSize: font.sm, fontWeight: '700', marginTop: spacing.md },
  input: {
    alignSelf: 'stretch',
    minHeight: 52,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.text,
    color: colors.text,
    fontSize: font.lg,
    fontWeight: '600',
  },
  error: { alignSelf: 'stretch', color: colors.danger, fontSize: font.sm, marginTop: spacing.sm },
  footer: { alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: layout.listBottomPad },
  pressed: { opacity: 0.75 },
});
