import { useEffect, useRef, useState } from "react";

/** `value`, but only after it has stopped changing for `ms`. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export interface SearchState<T> {
  /** Results for the current key; null while the first answer for it is pending, or when inactive. */
  results: T[] | null;
  /** True until the current key has an answer or an error. */
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Runs `fetcher` whenever `key` (or `refresh`) changes while `active`. A
 * response for an older key is ignored, so fast typing can't show stale
 * results, and every search ends in results or an error.
 */
export function useSearch<T>(
  fetcher: () => Promise<T[]>,
  key: string,
  active: boolean,
  refresh?: unknown,
): SearchState<T> {
  const [answer, setAnswer] = useState<{ key: string; results: T[] } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!active) return;
    const mine = ++latest.current;
    fetcherRef.current().then(
      results => {
        if (mine !== latest.current) return;
        setAnswer({ key, results });
        setError(null);
      },
      err => {
        if (mine !== latest.current) return;
        console.error("[search] failed:", err);
        setError({ key, message: err instanceof Error ? err.message : String(err) });
      },
    );
  }, [key, active, attempt, refresh]);

  if (!active) return { results: null, loading: false, error: null, retry: () => {} };
  const current = answer?.key === key ? answer.results : null;
  const currentError = error?.key === key ? error.message : null;
  return {
    results: current,
    loading: current === null && currentError === null,
    error: currentError,
    retry: () => setAttempt(a => a + 1),
  };
}
