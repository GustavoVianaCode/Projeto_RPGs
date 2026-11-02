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
  debounceMs = 300,
) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!worldId || !token || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(true);
      apiFetch<SearchResult[]>(
        `/worlds/${worldId}/search?q=${encodeURIComponent(query.trim())}`,
        token,
      )
        .then((data) => {
          setResults(data);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [worldId, token, query, debounceMs]);

  return { results, isLoading };
}

