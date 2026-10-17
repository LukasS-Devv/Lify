import { ScaledSize, StatusBar, useWindowDimensions } from 'react-native';

export const useApplicationDimensions = (): ScaledSize => {
  const { width, height, scale, fontScale } = useWindowDimensions();

  return {
    width,
    height: height + (StatusBar?.currentHeight || 0),
    scale,
    fontScale,
  };
};
