import { useState, useEffect, useCallback, useRef } from 'react';
import { GameSession, Wish } from '../types';
import { DashboardStats, deriveDashboardStats } from '../services/deriveDashboardStats';
import {
  fetchChildSessionsForAggregate,
  fetchChildSessionsRecent,
  fetchChildWishes,
} from '../services/supabaseSyncService';

export interface UseChildDashboardReturn {
  stats: DashboardStats | null;
  recentSessions: GameSession[];
  wishes: Wish[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook orchestrating child dashboard data retrieval.
 * Uses Promise.allSettled for resilient, partial-failure tolerant concurrent querying.
 *
 * Caller passes childId (agnostic of where activeChildId originates).
 * If childId is null, remains in idle state without executing any queries.
 */
export const useChildDashboard = (childId: string | null): UseChildDashboardReturn => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeChildIdRef = useRef(childId);
  activeChildIdRef.current = childId;

  const fetchDashboardData = useCallback(async () => {
    const currentTargetChildId = childId;
    if (!currentTargetChildId) {
      setStats(null);
      setRecentSessions([]);
      setWishes([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const [aggregateResult, recentResult, wishesResult] = await Promise.allSettled([
      fetchChildSessionsForAggregate(currentTargetChildId),
      fetchChildSessionsRecent(currentTargetChildId, 20),
      fetchChildWishes(currentTargetChildId),
    ]);

    // Discard stale responses if childId changed while fetch was in-flight
    if (activeChildIdRef.current !== currentTargetChildId) {
      return;
    }

    const errors: string[] = [];

    // 1. Aggregate Stats
    if (aggregateResult.status === 'fulfilled') {
      if (aggregateResult.value.error) {
        errors.push(aggregateResult.value.error);
      } else {
        setStats(deriveDashboardStats(aggregateResult.value.data || []));
      }
    } else {
      errors.push(aggregateResult.reason?.message || 'Failed to fetch aggregate sessions');
    }

    // 2. Recent Sessions
    if (recentResult.status === 'fulfilled') {
      if (recentResult.value.error) {
        errors.push(recentResult.value.error);
      } else {
        setRecentSessions(recentResult.value.data || []);
      }
    } else {
      errors.push(recentResult.reason?.message || 'Failed to fetch recent sessions');
    }

    // 3. Wishes
    if (wishesResult.status === 'fulfilled') {
      if (wishesResult.value.error) {
        errors.push(wishesResult.value.error);
      } else {
        setWishes(wishesResult.value.data || []);
      }
    } else {
      errors.push(wishesResult.reason?.message || 'Failed to fetch wishes');
    }

    if (errors.length > 0) {
      setError(errors.join('; '));
    } else {
      setError(null);
    }

    setLoading(false);
  }, [childId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    recentSessions,
    wishes,
    loading,
    error,
    refetch: fetchDashboardData,
  };
};
