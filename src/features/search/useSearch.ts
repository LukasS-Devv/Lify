import { useCallback, useEffect, useRef, useState } from 'react';
import { catalog } from '@/services/catalog';
import type { CatalogArtist } from '@/services/catalog/types';
import type { Track } from '@/types';
import { t } from '@/i18n';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [artists, setArtists] = useState<CatalogArtist[]>([]);
  const [artistError, setArtistError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const reqId = useRef(0);

  // sugestões com debounce enquanto digita
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const s = await catalog.suggestions(q);
      if (id === reqId.current) setSuggestions(s);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const submit = useCallback(async (override?: string) => {
    const q = (override ?? query).trim();
    if (!q) return;
    if (override !== undefined) setQuery(q);
    reqId.current++; // invalida sugestões pendentes
    const requestId = reqId.current;
    setSuggestions([]);
    setLoading(true); setError(null); setArtistError(null); setSearched(true);
    const [tracksResult, artistsResult] = await Promise.allSettled([
      catalog.search(q),
      catalog.searchArtists(q),
    ]);
    if (requestId !== reqId.current) return;
    if (tracksResult.status === 'fulfilled') {
      setResults(tracksResult.value);
      setError(null);
    } else {
      setResults([]);
      setError(tracksResult.reason instanceof Error ? tracksResult.reason.message : t('search.failed'));
    }
    if (artistsResult.status === 'fulfilled') {
      setArtists(artistsResult.value);
      setArtistError(null);
    } else {
      setArtists([]);
      setArtistError(artistsResult.reason instanceof Error ? artistsResult.reason.message : t('artist.searchFailed'));
    }
    setLoading(false);
  }, [query]);

  const clear = useCallback(() => {
    reqId.current++;
    setQuery(''); setResults([]); setArtists([]); setSuggestions([]); setError(null); setArtistError(null); setSearched(false); setLoading(false);
  }, []);

  return { query, setQuery, results, artists, artistError, suggestions, loading, error, searched, submit, clear };
}
