import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ImportError,
  previewPlaylistImport,
  savePlaylistImport,
  type PlaylistImportPreview,
} from '@/features/playlists/importPlaylist';
import { CatalogError } from '@/services/catalog/types';
import { t, useTranslation } from '@/i18n';
import { colors, font, radius, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Cover } from './Cover';
import { Dialog } from './Overlays';

const CONVERTER_URL = 'https://www.tunemymusic.com/';
const PREVIEW_ROWS = 5;

/** Importar playlist pública do YouTube Music: colar link → prévia → confirmar. */
export function ImportPlaylistModal({
  visible,
  onClose,
  onImported,
}: {
  visible: boolean;
  onClose: () => void;
  onImported: (playlistId: number) => void;
}) {
  useTranslation();

  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<PlaylistImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUrl('');
    setPreview(null);
    setError(null);
    setAnalyzing(false);
    setSaving(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const openLink = (link: string) => {
    void Linking.openURL(link).catch(() =>
      setError(t('import.sourceOpenFailed')),
    );
  };

  const analyze = async () => {
    setAnalyzing(true);
    setError(null);
    setPreview(null);

    try {
      setPreview(await previewPlaylistImport(url));
    } catch (e) {
      setError(
        e instanceof ImportError
          ? t(
              e.code === 'invalidLink'
                ? 'import.invalidLink'
                : 'import.noMatches',
            )
          : e instanceof CatalogError
            ? e.message
            : t('import.failed'),
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;

    setSaving(true);
    setError(null);

    try {
      const id = await savePlaylistImport(preview);
      reset();
      onImported(id);
    } catch (e) {
      setError(
        e instanceof ImportError
          ? t('import.noMatches')
          : t('import.failed'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={close}
      busy={saving}
      closeOnBackdrop={!saving}
      title={t('import.title')}
      width={480}
      contentStyle={s.dialog}
    >
          <ScrollView
            style={s.scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing.md }}
          >
            <Text style={s.hint}>{t('import.hint')}</Text>

            <TextInput
              value={url}
              onChangeText={(v) => {
                setUrl(v);
                setPreview(null);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder={t('import.linkPlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={s.input}
            />

            <Button
              icon="search"
              label={
                analyzing
                  ? t('import.analyzing')
                  : t('import.analyze')
              }
              onPress={analyze}
              disabled={!url.trim() || saving}
              loading={analyzing}
              style={s.actionButton}
            />

            <View style={s.tip}>
              <Text style={s.tipText}>
                {t('import.convertTip')}
              </Text>

              <Pressable
                accessibilityRole="link"
                onPress={() => openLink(CONVERTER_URL)}
              >
                <Text style={s.link}>
                  {t('import.openConverter')}
                </Text>
              </Pressable>
            </View>

            {error ? (
              <Text style={s.err}>{error}</Text>
            ) : null}

            {preview ? (
              <View style={s.preview}>
                <Text style={s.previewTitle}>
                  {preview.name}
                </Text>

                <Text style={s.hint}>
                  {t('import.source')} ·{' '}
                  {t('import.found', {
                    count: preview.tracks.length,
                  })}
                </Text>

                <Pressable
                  accessibilityRole="link"
                  onPress={() => openLink(preview.sourceUrl)}
                >
                  <Text style={s.link}>
                    {t('import.openSource')}
                  </Text>
                </Pressable>

                {preview.truncated ? (
                  <Text style={s.warn}>
                    {t('import.truncated')}
                  </Text>
                ) : null}

                {preview.tracks
                  .slice(0, PREVIEW_ROWS)
                  .map((tr) => (
                    <View key={tr.id} style={s.row}>
                      <Cover
                        uri={tr.artworkUrl}
                        size={40}
                      />

                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={s.rowTitle}
                        >
                          {tr.title}
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={s.hint}
                        >
                          {tr.artist}
                        </Text>
                      </View>
                    </View>
                  ))}

                {preview.tracks.length > PREVIEW_ROWS ? (
                  <Text style={s.hint}>
                    {t('import.more', {
                      count:
                        preview.tracks.length - PREVIEW_ROWS,
                    })}
                  </Text>
                ) : null}

                <Button
                  icon="download-outline"
                  label={
                    saving
                      ? t('import.importing')
                      : t('import.button', {
                          count: preview.tracks.length,
                        })
                  }
                  onPress={confirm}
                  loading={saving}
                  disabled={saving}
                  style={s.actionButton}
                />
              </View>
            ) : null}
          </ScrollView>
    </Dialog>
  );
}

const s = StyleSheet.create({
  dialog: { maxHeight: '88%' },
  scroll: { flexShrink: 1 },

  hint: {
    color: colors.textMuted,
    fontSize: font.md,
  },

  input: {
    width: '100%',
    minHeight: 48,
    backgroundColor: '#242424',
    color: colors.text,
    fontSize: font.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  actionButton: { width: '100%', minHeight: 48, borderRadius: 8 },

  tip: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },

  tipText: {
    color: colors.textMuted,
    fontSize: font.sm,
    lineHeight: 19,
  },

  link: {
    color: colors.accent,
    fontSize: font.sm,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  err: {
    color: colors.danger,
    fontSize: font.md,
  },

  warn: {
    color: colors.accent,
    fontSize: font.sm,
  },

  preview: {
    gap: spacing.sm,
  },

  previewTitle: {
    color: colors.text,
    fontSize: font.lg,
    fontWeight: '800',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  rowTitle: {
    color: colors.text,
    fontSize: font.md,
    fontWeight: '600',
  },
});
