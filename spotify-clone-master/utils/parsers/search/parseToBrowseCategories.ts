import { BrowseCategoriesResponseType } from '@config';

export const parseToBrowseCategories = (
  items: BrowseCategoriesResponseType['items']
) =>
  items.map(({ id, name, icons }) => ({
    id,
    title: name,
    imageURL: icons[0].url,
  }));
