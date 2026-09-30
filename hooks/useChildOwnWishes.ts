import { useState, useEffect, useCallback, useRef } from 'react';
import { ChildSafeWish, fetchChildSafeWishes } from '../services/supabaseSyncService';

export interface UseChildOwnWishesReturn {
  wishes: ChildSafeWish[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useChildOwnWishes = (childId: string | null): UseChildOwnWishesReturn => {
  const [wishes, setWishes] = useState<ChildSafeWish[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!childId) {
      requestIdRef.current += 1;
      setWishes([]);
      setLoading(false);
      setError(null);
      return;
    }
    const thisRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const result = await fetchChildSafeWishes(childId);

    if (thisRequestId !== requestIdRef.current) return; // stale — იგნორირდება

    if (result.error) {
      setError(result.error);
      setWishes([]);
    } else {
      setWishes(result.data || []);
    }
    setLoading(false);
  }, [childId]);

  useEffect(() => { load(); }, [load]);

  return { wishes, loading, error, refetch: load };
};
