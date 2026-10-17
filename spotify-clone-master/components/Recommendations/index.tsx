import * as React from 'react';

import { LibraryItemModel } from '@models';
import { getRecommendations } from '@api';
import { Slider } from '../Slider';
import { translations } from '@data';
import { Shapes, Sizes } from '@config';

export type RecommendationsPropsType = {
  type: 'artist' | 'tracks';
  seed: string;
  size?: Sizes;
  shape?: Shapes;
};

export const Recommendations = ({
  type,
  seed,
  size = Sizes.MEDIUM,
  shape = Shapes.SQUARE,
}: RecommendationsPropsType) => {
  const [recommendedAlbums, setRecommendedAlbums] = React.useState<
    LibraryItemModel[] | null
  >(null);

  React.useEffect(() => {
    if (!seed) {
      return;
    }

    (async () => {
      try {
        const recommendedAlbumsData = await getRecommendations({
          ...(type === 'tracks' && { tracksSeed: seed }),
          ...(type === 'artist' && { artistSeed: seed }),
        });
        setRecommendedAlbums(recommendedAlbumsData);
      } catch (error) {
        setRecommendedAlbums(null);
        console.error(error);
      }
    })();
  }, [type, seed]);

  return (
    <Slider
      title={translations.recommendations}
      slides={recommendedAlbums}
      size={size}
      shape={shape}
      withShowAll={true}
    />
  );
};
