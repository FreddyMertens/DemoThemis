'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/// Poll a stable async reader on an interval. Pass a module-level function or a
/// useCallback'd one so the identity is stable. Gives every screen explicit
/// loading / error / data states (the "never look broken" rule).
export function usePolledData<T>(
  fetcher: () => Promise<T>,
  intervalMs = 12000,
  stopOnError?: (error: string) => boolean,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(false);
  const generationRef = useRef(0);
  const requestRef = useRef(0);

  const run = useCallback(async (): Promise<string | null> => {
    const generation = generationRef.current;
    const request = ++requestRef.current;
    const isCurrent = () =>
      mountedRef.current && generation === generationRef.current && request === requestRef.current;
    try {
      const d = await fetcher();
      if (!isCurrent()) return null;
      setData(d);
      setError(null);
      return null;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!isCurrent()) return null;
      setError(message);
      return message;
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    generationRef.current += 1;
    requestRef.current = 0;
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    setData(null);
    setError(null);
    setLoading(true);
    const tick = async () => {
      if (!alive) return;
      const tickError = await run();
      if (alive && tickError && stopOnError?.(tickError) && timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };
    void tick();
    timer = setInterval(() => void tick(), intervalMs);
    return () => {
      alive = false;
      mountedRef.current = false;
      generationRef.current += 1;
      requestRef.current += 1;
      if (timer) clearInterval(timer);
    };
  }, [run, intervalMs, stopOnError]);

  return { data, error, loading, refresh: run };
}

/// Re-render every second so countdowns tick without refetching the chain.
export function useNow(stepMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), stepMs);
    return () => clearInterval(t);
  }, [stepMs]);
  return now;
}
