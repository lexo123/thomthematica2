// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChildDashboard } from './useChildDashboard';
import * as supabaseSyncService from '../services/supabaseSyncService';

describe('useChildDashboard (Parent Dashboard Orchestration Hook)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('remains in idle state without executing any queries when childId is null', async () => {
    const aggregateSpy = vi.spyOn(supabaseSyncService, 'fetchChildSessionsForAggregate');
    const recentSpy = vi.spyOn(supabaseSyncService, 'fetchChildSessionsRecent');
    const wishesSpy = vi.spyOn(supabaseSyncService, 'fetchChildWishes');

    const { result } = renderHook(() => useChildDashboard(null));

    expect(result.current.stats).toBeNull();
    expect(result.current.recentSessions).toEqual([]);
    expect(result.current.wishes).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    expect(aggregateSpy).not.toHaveBeenCalled();
    expect(recentSpy).not.toHaveBeenCalled();
    expect(wishesSpy).not.toHaveBeenCalled();
  });

  it('transitions from loading to success and populates all data including derived stats', async () => {
    const mockAggregateSessions = [
      { total_questions: 40, total_correct: 36, perfect_blocks_count: 0, status: 'completed' as const },
      { total_questions: 40, total_correct: 40, perfect_blocks_count: 1, status: 'completed' as const },
    ];
    const mockRecentSessions = [
      {
        id: 's-1',
        child_id: 'child-1',
        game_mode: 'thomthematica',
        total_questions: 40,
        total_correct: 40,
        perfect_blocks_count: 1,
        duration_seconds: 120,
        status: 'completed' as const,
        started_at: '2026-09-04T10:00:00Z',
        updated_at: '2026-09-04T10:02:00Z',
      },
    ];
    const mockWishes = [
      {
        id: 'w-1',
        child_id: 'child-1',
        wish_text: 'Remote control drone',
        correct_count: 40 as const,
        status: 'pending' as const,
        created_at: '2026-09-04T10:02:00Z',
      },
    ];

    vi.spyOn(supabaseSyncService, 'fetchChildSessionsForAggregate').mockResolvedValue({
      data: mockAggregateSessions,
      error: null,
    });
    vi.spyOn(supabaseSyncService, 'fetchChildSessionsRecent').mockResolvedValue({
      data: mockRecentSessions,
      error: null,
    });
    vi.spyOn(supabaseSyncService, 'fetchChildWishes').mockResolvedValue({
      data: mockWishes,
      error: null,
    });

    const { result } = renderHook(() => useChildDashboard('child-1'));

    // Loading transition
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.recentSessions).toEqual(mockRecentSessions);
    expect(result.current.wishes).toEqual(mockWishes);
    expect(result.current.stats).toEqual({
      completedSessionCount: 2,
      totalQuestions: 80,
      totalCorrect: 76,
      accuracyPercent: 95,
      perfectBlocksCount: 1,
    });
  });

  it('handles partial failure gracefully: keeps successful data and records error', async () => {
    const mockAggregateSessions = [
      { total_questions: 40, total_correct: 40, perfect_blocks_count: 1, status: 'completed' as const },
    ];
    const mockRecentSessions = [
      {
        id: 's-1',
        child_id: 'child-1',
        game_mode: 'thomthematica',
        total_questions: 40,
        total_correct: 40,
        perfect_blocks_count: 1,
        duration_seconds: 120,
        status: 'completed' as const,
        started_at: '2026-09-04T10:00:00Z',
        updated_at: '2026-09-04T10:02:00Z',
      },
    ];

    // Aggregate and Recent succeed, but Wishes fails
    vi.spyOn(supabaseSyncService, 'fetchChildSessionsForAggregate').mockResolvedValue({
      data: mockAggregateSessions,
      error: null,
    });
    vi.spyOn(supabaseSyncService, 'fetchChildSessionsRecent').mockResolvedValue({
      data: mockRecentSessions,
      error: null,
    });
    vi.spyOn(supabaseSyncService, 'fetchChildWishes').mockResolvedValue({
      data: null,
      error: 'Failed to retrieve wishes from Supabase',
    });

    const { result } = renderHook(() => useChildDashboard('child-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Error recorded
    expect(result.current.error).toBe('Failed to retrieve wishes from Supabase');
    // Successful queries data preserved!
    expect(result.current.stats).toEqual({
      completedSessionCount: 1,
      totalQuestions: 40,
      totalCorrect: 40,
      accuracyPercent: 100,
      perfectBlocksCount: 1,
    });
    expect(result.current.recentSessions).toEqual(mockRecentSessions);
    // Failed query leaves state empty
    expect(result.current.wishes).toEqual([]);
  });

  it('handles promise rejection in Promise.allSettled without crashing', async () => {
    vi.spyOn(supabaseSyncService, 'fetchChildSessionsForAggregate').mockRejectedValue(
      new Error('Network timeout during aggregate query')
    );
    vi.spyOn(supabaseSyncService, 'fetchChildSessionsRecent').mockResolvedValue({
      data: [],
      error: null,
    });
    vi.spyOn(supabaseSyncService, 'fetchChildWishes').mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useChildDashboard('child-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network timeout during aggregate query');
    expect(result.current.stats).toBeNull();
    expect(result.current.recentSessions).toEqual([]);
  });

  it('triggers refetch when childId changes', async () => {
    const aggregateSpy = vi.spyOn(supabaseSyncService, 'fetchChildSessionsForAggregate').mockResolvedValue({
      data: [],
      error: null,
    });
    const recentSpy = vi.spyOn(supabaseSyncService, 'fetchChildSessionsRecent').mockResolvedValue({
      data: [],
      error: null,
    });
    const wishesSpy = vi.spyOn(supabaseSyncService, 'fetchChildWishes').mockResolvedValue({
      data: [],
      error: null,
    });

    const { result, rerender } = renderHook(({ id }) => useChildDashboard(id), {
      initialProps: { id: 'child-1' as string | null },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(aggregateSpy).toHaveBeenCalledWith('child-1');
    expect(recentSpy).toHaveBeenCalledWith('child-1', 20);
    expect(wishesSpy).toHaveBeenCalledWith('child-1');

    // Switch to child-2
    rerender({ id: 'child-2' });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(aggregateSpy).toHaveBeenCalledWith('child-2');
    expect(recentSpy).toHaveBeenCalledWith('child-2', 20);
    expect(wishesSpy).toHaveBeenCalledWith('child-2');
  });

  it('triggers manual refetch when refetch() is called', async () => {
    const aggregateSpy = vi.spyOn(supabaseSyncService, 'fetchChildSessionsForAggregate').mockResolvedValue({
      data: [],
      error: null,
    });
    vi.spyOn(supabaseSyncService, 'fetchChildSessionsRecent').mockResolvedValue({
      data: [],
      error: null,
    });
    vi.spyOn(supabaseSyncService, 'fetchChildWishes').mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useChildDashboard('child-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(aggregateSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(aggregateSpy).toHaveBeenCalledTimes(2);
  });
});
