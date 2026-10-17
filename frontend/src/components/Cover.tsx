import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius as r } from '@/theme/tokens';
import { tintFor } from '@/utils/color';
import { Icon, type IconName } from './Icon';
import { ArtworkImage } from './ArtworkImage';

/** Capa quadrada com fundo de reserva e fallback se a imagem falhar. */
export function Cover({ uri, size, radius = r.sm, seed, icon = 'musical-notes', style }: {
  uri?: string | null; size: number; radius?: number; seed?: string; icon?: IconName; style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!uri && !failed;
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, backgroundColor: seed ? tintFor(seed, 0.28) : colors.surfaceAlt }, s.box, style]}>
      {showImage ? (
        <ArtworkImage uri={uri} style={StyleSheet.absoluteFill} onError={() => setFailed(true)} />
      ) : (
        <Icon name={icon} size={Math.max(16, size * 0.38)} color="rgba(255,255,255,0.7)" />
      )}
    </View>
  );
}

/** Capa em mosaico 2x2 (playlists). Com 1 imagem usa a capa simples. */
export function MosaicCover({ uris, size, radius = r.md, seed }: { uris: string[]; size: number; radius?: number; seed: string }) {
  if (uris.length < 2) return <Cover uri={uris[0]} size={size} radius={radius} seed={seed} icon="list" />;
  const half = size / 2;
  return (
    <View style={[{ width: size, height: size, borderRadius: radius }, s.box, s.mosaic]}>
      {[0, 1, 2, 3].map((i) => (
        <Cover key={i} uri={uris[i % uris.length]} size={half} radius={0} seed={`${seed}${i}`} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  box: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  mosaic: { flexDirection: 'row', flexWrap: 'wrap' },
});
