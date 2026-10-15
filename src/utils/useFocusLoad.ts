import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Executa `loader` sempre que a tela ganha foco; expõe estado e reload manual. */
export function useFocusLoad<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loaderRef = useRef(loader);
  loaderRef.current = loader; // sempre a versão mais recente (ex.: depende de um id)

  const reload = useCallback(async () => {
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return { data, loading, error, reload };
}
