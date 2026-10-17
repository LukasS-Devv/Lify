import * as React from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { useLibrarySelectedCategory } from '@context';
import { Categories, COLORS } from '@config';
import { translations } from '@data';

import { styles } from './styles';

export type CategoryPressablePropsType = {
  currentCategory: Exclude<Categories, Categories.ALL>;
};

const CategoryPressable = React.memo(
  ({ currentCategory }: CategoryPressablePropsType) => {
    const {
      librarySelectedCategory,
      setLibrarySelectedCategory,
      animatedValue,
    } = useLibrarySelectedCategory();

    const handleCategoryChange = React.useCallback(
      (newCategory: Categories) => {
        animatedValue.value = withTiming(0, { duration: 100 }, (isFinished) => {
          if (!isFinished) {
            return;
          }

          runOnJS(setLibrarySelectedCategory)(
            librarySelectedCategory === newCategory
              ? Categories.ALL
              : newCategory
          );

          animatedValue.value = withTiming(1, { duration: 1000 });
        });
      },
      [animatedValue, librarySelectedCategory, setLibrarySelectedCategory]
    );

    const animatedPressableStyles = useAnimatedStyle(() => ({
      backgroundColor: interpolateColor(
        currentCategory === librarySelectedCategory ? animatedValue.value : 0,
        [0, 1],
        [COLORS.SECONDARY, COLORS.TINT]
      ),
    }));

    const animatedTextStyles = useAnimatedStyle(() => ({
      color: interpolateColor(
        currentCategory === librarySelectedCategory ? animatedValue.value : 0,
        [0, 0.2, 1],
        [COLORS.WHITE, COLORS.PRIMARY, COLORS.PRIMARY]
      ),
    }));

    const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
    const AnimatedText = Animated.createAnimatedComponent(Text);

    return (
      <AnimatedPressable
        style={[styles.category, animatedPressableStyles]}
        onPress={() => handleCategoryChange(currentCategory)}
      >
        <AnimatedText style={[styles.categoryText, animatedTextStyles]}>
          {translations.libraryCategories[currentCategory]}
        </AnimatedText>
      </AnimatedPressable>
    );
  }
);

CategoryPressable.displayName = 'CategoryPressable';

export { CategoryPressable };
