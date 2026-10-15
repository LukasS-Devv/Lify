import { youtubeCatalog } from './youtube';
import type { CatalogProvider } from './types';

export * from './types';
export const catalog: CatalogProvider = youtubeCatalog;
