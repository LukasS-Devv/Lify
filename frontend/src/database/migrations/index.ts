/**
 * Migrations versionadas via PRAGMA user_version.
 * NUNCA edite uma migration já publicada: crie a próxima (versão N+1).
 */
export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'init',
    sql: `
      CREATE TABLE tracks (
        id TEXT PRIMARY KEY NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT,
        duration_sec INTEGER,
        artwork_url TEXT NOT NULL
      );

      CREATE TABLE playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE playlist_tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        added_at INTEGER NOT NULL
      );
      CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id, position);

      CREATE TABLE favorites (
        track_id TEXT PRIMARY KEY NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
        added_at INTEGER NOT NULL
      );

      CREATE TABLE history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
        played_at INTEGER NOT NULL
      );
      CREATE INDEX idx_history_played_at ON history(played_at DESC);

      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: 'playlist-covers',
    sql: `ALTER TABLE playlists ADD COLUMN cover_url TEXT;`,
  },
  {
    version: 3,
    name: 'catalog-cache',
    sql: `
      CREATE TABLE catalog_cache (
        cache_key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX idx_catalog_cache_updated_at ON catalog_cache(updated_at DESC);
    `,
  },
  {
    version: 4,
    name: 'blank-unknown-artist',
    // Limpa o placeholder antigo ("Artista desconhecido"/"Unknown artist") gravado
    // em faixas sem artista; agora a UI mostra o campo vazio.
    sql: `UPDATE tracks SET artist = '' WHERE artist IN ('Artista desconhecido', 'Unknown artist');`,
  },
  {
    version: 5,
    name: 'playlist-pins',
    sql: `ALTER TABLE playlists ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;`,
  },
  {
    version: 6,
    name: 'track-downloads',
    sql: `
      CREATE TABLE downloads (
        track_id TEXT PRIMARY KEY NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
        local_path TEXT NOT NULL,
        downloaded_at INTEGER NOT NULL
      );
    `,
  },
];

export const LATEST_VERSION = migrations[migrations.length - 1].version;
