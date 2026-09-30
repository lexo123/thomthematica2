import { useState, useEffect, useCallback, useRef } from 'react';
import { Wish } from '../types';
import { fetchFamilyPendingWishes } from '../services/supabaseSyncService';

export interface UseFamilyPendingWishesReturn {
  wishes: Wish[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Loads family-wide pending wishes (wish_pending & image_pending) when enabled (parent mode).
 * Uses requestIdRef generation counter to discard stale out-of-order responses.
 */
export const useFamilyPendingWishes = (enabled: boolean): UseFamilyPendingWishesReturn => {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) {
      requestIdRef.current += 1;
      setWishes([]);
      setLoading(false);
      setError(null);
      return;
    }
    const thisRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const result = await fetchFamilyPendingWishes();

    if (thisRequestId !== requestIdRef.current) return; // stale — იგნორირდება

    if (result.error) {
      setError(result.error);
      setWishes([]);
    } else {
      setWishes(result.data || []);
    }
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { wishes, loading, error, refetch: load };
};
