import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { t } from '@/i18n';

export async function pickPlaylistCover(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'image/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error(t('playlist.coverPickFailed'));
  const extension = asset.name?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? 'jpg';
  const directory = new Directory(Paths.document, 'playlist-covers');
  directory.create({ intermediates: true, idempotent: true });
  const savedFile = new File(directory, `playlist-${Date.now()}.${extension}`);
  await new File(asset.uri).copy(savedFile);
  return savedFile.uri;
}
