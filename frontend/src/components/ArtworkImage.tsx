import { useEffect, useState } from 'react';
import { Image, type ImageSourcePropType, type StyleProp, type ImageErrorEventData, type ImageStyle, type NativeSyntheticEvent } from 'react-native';
import { highResolutionImageUrl } from '@/utils/track';

export function ArtworkImage({ uri, source, style, onError }: {
  uri?: string | null;
  source?: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  onError?: (event: NativeSyntheticEvent<ImageErrorEventData>) => void;
}) {
  const [fallback, setFallback] = useState(false);
  useEffect(() => setFallback(false), [uri, source]);

  const optimizedUri = uri ? highResolutionImageUrl(uri) : undefined;
  const imageSource = source ?? (
    optimizedUri
      ? { uri: fallback ? optimizedUri.replace(/maxresdefault(?=\.[a-z]+$)/i, 'hqdefault') : optimizedUri }
      : undefined
  );
  if (!imageSource) return null;
  return (
    <Image
      source={imageSource}
      resizeMode="cover"
      style={[style, { transform: [{ scale: 1.06 }] }]}
      onError={(event) => {
        if (!source && !fallback && optimizedUri?.includes('maxresdefault')) {
          setFallback(true);
          return;
        }
        onError?.(event);
      }}
    />
  );
}
