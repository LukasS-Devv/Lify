import { useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, EmptyState, Screen } from '@/components';
import { usePlaylists } from '@/features/playlists/usePlaylists';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { CatalogError } from '@/services/catalog/types';
import {
  previewPlaylistImport,
  savePlaylistImport,
  type PlaylistImportPreview,
} from '@/features/playlists/importPlaylist';
import { Card } from '@/components/spotify-clone';

export default function Playlists() {
  useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data, loading, error, create, reload } = usePlaylists();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importPreview, setImportPreview] = useState<PlaylistImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingImport, setSavingImport] = useState(false);

  const submit = async () => {
    if (creating) return;
    setCreating(true);
    setFormError(null);
    try {
      const id = await create(name);
      setName('');
      router.push({ pathname: '/playlist/[id]', params: { id: String(id) } });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const analyzeImport = async () => {
    setAnalyzing(true);
    setImportError(null);
    setImportPreview(null);
    try {
      const preview = await previewPlaylistImport(importUrl);
      setImportPreview(preview);
    } catch (e) {
      setImportError(e instanceof CatalogError ? e.message : t(e instanceof Error && e.message === 'import.invalidLink' ? 'import.invalidLink' : 'import.failed'));
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setSavingImport(true);
    setImportError(null);
    try {
      const playlistId = await savePlaylistImport(importPreview);
      await reload();
      setImportPreview(null);
      setImportUrl('');
      router.push({ pathname: '/playlist/[id]', params: { id: String(playlistId) } });
    } catch (e) {
      setImportError(t(e instanceof Error && e.message === 'import.noMatches' ? 'import.noMatches' : 'import.failed'));
    } finally {
      setSavingImport(false);
    }
  };

  const matchedCount = importPreview?.tracks.length ?? 0;

  return (
    <Screen title={t('library.tab.playlists')}>
      <FlatList
        data={data}
        numColumns={3}
        keyExtractor={(playlist) => String(playlist.id)}
        columnWrapperStyle={s.columns}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <View>
            <View style={s.createPanel}>
              <View style={s.createHeading}>
                <View style={s.createIcon}><Text style={s.plus}>＋</Text></View>
                <View style={s.createCopy}>
                  <Text style={s.createTitle}>{t('playlist.newTitle')}</Text>
                  <Text style={s.createHint}>{t('library.emptyPlaylists')}</Text>
                </View>
              </View>
              <View style={s.form}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onSubmitEditing={submit}
                  editable={!creating}
                  placeholder={t('playlist.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  style={s.input}
                />
                <Button label={t('common.create')} onPress={submit} loading={creating} />
              </View>
              {formError || error ? <Text style={s.err}>{formError ?? error}</Text> : null}
            </View>
            <View style={s.importPanel}>
              <Text style={s.createTitle}>{t('import.title')}</Text>
              <Text style={s.createHint}>{t('import.hint')}</Text>
              <View style={s.spotifyTip}>
                <Text style={s.spotifyTipText}>{t('import.convertTip')}</Text>
                <Text
                  accessibilityRole="link"
                  onPress={() => {
                    void Linking.openURL('https://www.tunemymusic.com/').catch(() => setImportError(t('import.sourceOpenFailed')));
                  }}
                  style={s.spotifyLink}
                >
                  {t('import.openConverter')}
                </Text>
              </View>
              <TextInput
                value={importUrl}
                onChangeText={(value) => {
                  setImportUrl(value);
                  setImportPreview(null);
                  setImportError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder={t('import.linkPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={s.importInput}
              />
              <Button
                label={analyzing ? t('import.analyzing') : t('import.analyze')}
                onPress={analyzeImport}
                disabled={analyzing || savingImport || !importUrl.trim()}
              />
              {importError ? <Text style={s.err}>{importError}</Text> : null}
              {importPreview ? (
                <View style={s.preview}>
                  <Text style={s.previewTitle}>{importPreview.name}</Text>
                  <Text style={s.createHint}>{t('import.source')}</Text>
                  <Text
                    accessibilityRole="link"
                    onPress={() => {
                      void Linking.openURL(importPreview.sourceUrl).catch(() => setImportError(t('import.sourceOpenFailed')));
                    }}
                    style={s.sourceLink}
                  >
                    {t('import.openSource')}
                  </Text>
                  <Text style={s.countText}>
                    {t('import.found', { count: matchedCount })}
                  </Text>
                  {importPreview.truncated ? <Text style={s.warning}>{t('import.truncated')}</Text> : null}
                  {importPreview.tracks.slice(0, 5).map((track) => (
                    <View key={track.id} style={s.previewRow}>
                      <View style={s.previewCopy}>
                        <Text numberOfLines={1} style={s.previewTrack}>{track.title}</Text>
                        <Text numberOfLines={1} style={s.createHint}>{track.artist}</Text>
                      </View>
                    </View>
                  ))}
                  {!matchedCount ? <Text style={s.err}>{t('import.noMatches')}</Text> : null}
                  <Button
                    label={savingImport ? t('import.importing') : t('import.button', { count: matchedCount })}
                    onPress={confirmImport}
                    disabled={savingImport || !matchedCount}
                  />
                </View>
              ) : null}
            </View>
            {data.length ? <Text style={s.section}>{t('home.playlists')}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Card
            item={{
              id: String(item.id),
              title: item.name,
              subtitle: t('common.tracks', { count: item.trackCount }),
              imageUrl: item.coverUrl ?? undefined,
              onPress: () => router.push({ pathname: '/playlist/[id]', params: { id: String(item.id) } }),
            }}
            size={(width - spacing.md * 2 - spacing.md * 2) / 3}
          />
        )}
        ListEmptyComponent={<EmptyState loading={loading} message={loading ? t('common.loading') : t('library.emptyPlaylists')} />}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: spacing.lg },
  createPanel: {
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
  importPanel: {
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
  importInput: {
    minHeight: 44,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: font.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  spotifyTip: { padding: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  spotifyTipText: { color: colors.textMuted, fontSize: font.sm, lineHeight: 19 },
  spotifyLink: { color: colors.accent, fontWeight: '800', textDecorationLine: 'underline' },
  preview: { gap: spacing.sm, marginTop: spacing.sm },
  previewTitle: { color: colors.text, fontSize: font.lg, fontWeight: '800' },
  sourceLink: { color: colors.accent, fontSize: font.sm, fontWeight: '700', textDecorationLine: 'underline' },
  countText: { color: colors.text, fontSize: font.sm, fontWeight: '700' },
  warning: { color: colors.accent, fontSize: font.sm },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  previewCopy: { flex: 1, gap: 2 },
  previewTrack: { color: colors.text, fontSize: font.sm, fontWeight: '600' },
  matchState: { fontSize: font.sm, fontWeight: '700' },
  matched: { color: colors.accent },
  unmatched: { color: colors.textMuted },
  createHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  createIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  plus: { color: colors.accent, fontSize: 28, lineHeight: 30 },
  createCopy: { flex: 1, gap: 4 },
  createTitle: { color: colors.text, fontSize: font.md, fontWeight: '800' },
  createHint: { color: colors.textMuted, fontSize: font.sm },
  form: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: font.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  err: { color: colors.danger, fontSize: font.sm },
  section: { color: colors.text, fontSize: font.xl, fontWeight: '800', paddingHorizontal: spacing.md, marginBottom: spacing.md },
  columns: { justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.md },
});
