import { useCallback, useEffect, useRef, useState } from 'react';
import { catalog } from '@/services/catalog';
import type { CatalogArtist } from '@/services/catalog/types';
import type { Track } from '@/types';
import { t } from '@/i18n';

export function useSearch() {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [artists, setArtists] = useState<CatalogArtist[]>([]);
  const [artistError, setArtistError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const searchReqId = useRef(0);
  const suggestionReqId = useRef(0);

  const setQuery = useCallback((value: string) => {
    searchReqId.current++;
    suggestionReqId.current++;
    setQueryState(value);
    setResults([]);
    setArtists([]);
    setSuggestions([]);
    setLoading(false);
    setError(null);
    setArtistError(null);
    setSearched(false);
  }, []);

  useEffect(() => {
    const q = query.trim();
    const requestId = ++suggestionReqId.current;
    if (searched || q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const found = await catalog.suggestions(q);
        if (requestId === suggestionReqId.current) setSuggestions(found);
      } catch {
        if (requestId === suggestionReqId.current) setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, searched]);

  const submit = useCallback(async (override?: string) => {
    const q = (override ?? query).trim();
    if (!q) return;
    suggestionReqId.current++;
    const requestId = ++searchReqId.current;
    if (override !== undefined) setQueryState(q);
    setSuggestions([]);
    setResults([]);
    setArtists([]);
    setLoading(true); setError(null); setArtistError(null); setSearched(true);
    void catalog.searchArtists(q).then((foundArtists) => {
      if (requestId === searchReqId.current) {
        setArtists(foundArtists);
        setArtistError(null);
      }
    }).catch((reason: unknown) => {
      if (requestId === searchReqId.current) {
        setArtists([]);
        setArtistError(reason instanceof Error ? reason.message : t('artist.searchFailed'));
      }
    });
    try {
      const foundTracks = await catalog.search(q);
      if (requestId !== searchReqId.current) return;
      setResults(foundTracks);
      setError(null);
    } catch (reason) {
      if (requestId !== searchReqId.current) return;
      setResults([]);
      setError(reason instanceof Error ? reason.message : t('search.failed'));
    } finally {
      if (requestId === searchReqId.current) setLoading(false);
    }
  }, [query]);

  const clear = useCallback(() => {
    searchReqId.current++;
    suggestionReqId.current++;
    setQueryState('');
    setResults([]); setArtists([]); setSuggestions([]); setError(null); setArtistError(null); setSearched(false); setLoading(false);
  }, []);

  return { query, setQuery, results, artists, artistError, suggestions, loading, error, searched, submit, clear };
}
