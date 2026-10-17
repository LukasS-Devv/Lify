/** Erro de importação com código estável; a UI traduz via `import.<code>`. */
export class ImportError extends Error {
  constructor(public readonly code: 'invalidLink' | 'noMatches') {
    super(code);
    this.name = 'ImportError';
  }
}

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'music.youtube.com', 'm.youtube.com'];

/** Aceita só links https de playlist pública do YouTube/YouTube Music. */
export function parsePlaylistLink(value: string): { playlistId: string; canonicalUrl: string } {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ImportError('invalidLink');
  }
  if (url.protocol !== 'https:') throw new ImportError('invalidLink');
  if (!YOUTUBE_HOSTS.includes(url.hostname.toLowerCase())) throw new ImportError('invalidLink');
  if (url.pathname !== '/playlist' && url.pathname !== '/watch') throw new ImportError('invalidLink');
  const playlistId = url.searchParams.get('list') ?? '';
  if (!/^[A-Za-z0-9_-]{10,128}$/.test(playlistId)) throw new ImportError('invalidLink');
  return {
    playlistId,
    canonicalUrl: `https://music.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`,
  };
}
