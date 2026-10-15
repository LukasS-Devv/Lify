import type { Db } from '@/database/types';

/** Ordem respeita as FKs. Colunas fixas: não confiamos no schema do arquivo importado. */
const TABLES: { name: string; cols: string[] }[] = [
  { name: 'tracks', cols: ['id', 'source', 'source_id', 'title', 'artist', 'album', 'duration_sec', 'artwork_url'] },
  { name: 'playlists', cols: ['id', 'name', 'description', 'created_at', 'updated_at'] },
  { name: 'playlist_tracks', cols: ['id', 'playlist_id', 'track_id', 'position', 'added_at'] },
  { name: 'favorites', cols: ['track_id', 'added_at'] },
  { name: 'history', cols: ['id', 'track_id', 'played_at'] },
  { name: 'settings', cols: ['key', 'value'] },
];

/** Substitui todo o conteúdo de `target` pelo de `source` numa única transação. */
export async function copyAllData(source: Db, target: Db): Promise<void> {
  // lê tudo antes de abrir a transação no destino
  const data = new Map<string, Record<string, string | number | null>[]>();
  for (const t of TABLES) {
    data.set(t.name, await source.getAllAsync(`SELECT ${t.cols.join(', ')} FROM ${t.name}`));
  }

  await target.withTransactionAsync(async () => {
    for (const t of [...TABLES].reverse()) await target.runAsync(`DELETE FROM ${t.name}`);
    for (const t of TABLES) {
      const sql = `INSERT INTO ${t.name} (${t.cols.join(', ')}) VALUES (${t.cols.map(() => '?').join(', ')})`;
      for (const row of data.get(t.name)!) {
        await target.runAsync(sql, ...t.cols.map((c) => row[c] ?? null));
      }
    }
  });
}
