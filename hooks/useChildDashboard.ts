import { useState, useEffect, useCallback, useRef } from 'react';
import { GameSession, Wish } from '../types';
import { DashboardStats, deriveDashboardStats } from '../services/deriveDashboardStats';
import {
  fetchChildSessionsForAggregate,
  fetchChildSessionsRecent,
  fetchChildWishes,
  fetchChildSessionsGameModeBreakdown,
} from '../services/supabaseSyncService';
import {
  GameModeBreakdown,
  deriveGameModeBreakdown,
} from '../services/deriveGameModeBreakdown';

export interface UseChildDashboardReturn {
  stats: DashboardStats | null;
  recentSessions: GameSession[];
  wishes: Wish[];
  gameModeBreakdown: GameModeBreakdown;
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
  const [gameModeBreakdown, setGameModeBreakdown] = useState<GameModeBreakdown>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const fetchDashboardData = useCallback(async () => {
    const currentTargetChildId = childId;
    if (!currentTargetChildId) {
      requestIdRef.current += 1; // Invalidate any in-flight request
      setStats(null);
      setRecentSessions([]);
      setWishes([]);
      setGameModeBreakdown({});
      setLoading(false);
      setError(null);
      return;
    }

    const thisRequestId = ++requestIdRef.current; // Unique ID for this fetch cycle

    setLoading(true);
    setError(null);

    const [aggregateResult, recentResult, wishesResult, breakdownResult] = await Promise.allSettled([
      fetchChildSessionsForAggregate(currentTargetChildId),
      fetchChildSessionsRecent(currentTargetChildId, 20),
      fetchChildWishes(currentTargetChildId),
      fetchChildSessionsGameModeBreakdown(currentTargetChildId),
    ]);

    // Only the latest fetch response is applied; stale responses are ignored
    if (thisRequestId !== requestIdRef.current) {
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

    // 4. Game Mode Breakdown
    if (breakdownResult.status === 'fulfilled') {
      if (breakdownResult.value.error) {
        errors.push(breakdownResult.value.error);
      } else {
        setGameModeBreakdown(deriveGameModeBreakdown(breakdownResult.value.data || []));
      }
    } else {
      errors.push(breakdownResult.reason?.message || 'Failed to fetch game mode breakdown');
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
    gameModeBreakdown,
    loading,
    error,
    refetch: fetchDashboardData,
  };
};
