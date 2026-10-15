import { useCallback, useEffect, useRef, useState } from 'react';
import { catalog } from '@/services/catalog';
import type { Track } from '@/types';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
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
    setSuggestions([]);
    setLoading(true); setError(null); setSearched(true);
    try {
      setResults(await catalog.search(q));
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : 'Falha na busca.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  return { query, setQuery, results, suggestions, loading, error, searched, submit };
}
