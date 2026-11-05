import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

export interface SearchResult {
  id: string;
  title: string;
  summary: string | null;
  icon: string | null;
  slug: string;
  cardTypeId: string;
  folderId: string | null;
  parentCardId: string | null;
  documentId: string;
  rank: number;
}

export function useSearch(
  worldId: string | null,
  token: string | null,
  query: string,
  debounceMs = 250,
) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!worldId || !token || trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const timer = setTimeout(() => {
      apiFetch<SearchResult[]>(
        `/worlds/${worldId}/search?q=${encodeURIComponent(trimmed)}`,
        token,
        { signal: controller.signal },
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setResults(data ?? []);
          }
        })
        .catch((err) => {
          // Ignore cancelled/aborted fetch errors
          if (err instanceof DOMException && err.name === 'AbortError') return;
          if (err?.name === 'AbortError') return;
          if (!controller.signal.aborted) {
            setResults([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [worldId, token, query, debounceMs]);

  return { results, isLoading };
}
