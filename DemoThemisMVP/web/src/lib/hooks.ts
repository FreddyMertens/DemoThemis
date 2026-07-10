'use client';
import { useCallback, useEffect, useState } from 'react';

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

  const run = useCallback(async (): Promise<string | null> => {
    try {
      const d = await fetcher();
      setData(d);
      setError(null);
      return null;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      return message;
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
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
