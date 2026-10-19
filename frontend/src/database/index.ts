export { getDb, runMigrations, resetDatabase, DB_NAME } from './client';
export type { Db } from './types';
export * as tracksRepo from './repositories/tracks';
export * as playlistsRepo from './repositories/playlists';
export * as favoritesRepo from './repositories/favorites';
export * as historyRepo from './repositories/history';
export * as settingsRepo from './repositories/settings';
