import * as React from 'react';

import { Categories } from '@config';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

export type LibrarySelectedCategoryProviderPropsType = {
  children: React.ReactNode;
};

export const LibrarySelectedCategoryContext = React.createContext<{
  librarySelectedCategory: Categories;
  setLibrarySelectedCategory: React.Dispatch<React.SetStateAction<Categories>>;
  animatedValue: SharedValue<number> | null;
}>({
  librarySelectedCategory: Categories.ALL,
  setLibrarySelectedCategory: () => {},
  animatedValue: null,
});

export const LibrarySelectedCategoryProvider = ({
  children,
}: LibrarySelectedCategoryProviderPropsType) => {
  const [librarySelectedCategory, setLibrarySelectedCategory] =
    React.useState<Categories>(Categories.ALL);
  const animatedValue = useSharedValue(1);

  return (
    <LibrarySelectedCategoryContext.Provider
      value={{
        librarySelectedCategory,
        setLibrarySelectedCategory,
        animatedValue: animatedValue as SharedValue<number>,
      }}
    >
      {children}
    </LibrarySelectedCategoryContext.Provider>
  );
};

export const useLibrarySelectedCategory = (): {
  librarySelectedCategory: Categories;
  setLibrarySelectedCategory: React.Dispatch<React.SetStateAction<Categories>>;
  animatedValue: SharedValue<number>;
} => {
  const context = React.useContext(LibrarySelectedCategoryContext);

  if (
    context.animatedValue === null ||
    !context.librarySelectedCategory ||
    !context.setLibrarySelectedCategory
  ) {
    throw new Error('Failed to access context values');
  }

  return { ...context, animatedValue: context.animatedValue };
};
