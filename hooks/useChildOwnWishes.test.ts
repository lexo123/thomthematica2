// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChildOwnWishes } from './useChildOwnWishes';
import * as supabaseSyncService from '../services/supabaseSyncService';
import { ChildSafeWish } from '../types';

describe('useChildOwnWishes Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not call fetchChildSafeWishes when childId is null', () => {
    const fetchSpy = vi.spyOn(supabaseSyncService, 'fetchChildSafeWishes');

    const { result } = renderHook(() => useChildOwnWishes(null));

    expect(result.current.wishes).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('calls fetchChildSafeWishes with childId and returns wishes on success', async () => {
    const mockWishes: ChildSafeWish[] = [
      {
        id: 'w-1',
        wish_text: 'ველოსიპედი',
        status: 'wish_pending',
        wish_parent_note: null,
        correct_count: 40,
        created_at: '2026-09-29T10:00:00Z',
      },
      {
        id: 'w-2',
        wish_text: 'დრონი',
        status: 'wish_rejected',
        wish_parent_note: 'სხვა მოიფიქრე',
        correct_count: 39,
        created_at: '2026-09-29T11:00:00Z',
      },
    ];

    const fetchSpy = vi
      .spyOn(supabaseSyncService, 'fetchChildSafeWishes')
      .mockResolvedValue({ data: mockWishes, error: null });

    const { result } = renderHook(() => useChildOwnWishes('child-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('child-1');
    expect(result.current.error).toBeNull();
    expect(result.current.wishes).toEqual(mockWishes);
  });

  it('sets error and clears wishes when fetchChildSafeWishes returns an error', async () => {
    vi.spyOn(supabaseSyncService, 'fetchChildSafeWishes').mockResolvedValue({
      data: null,
      error: 'Failed to load child wishes',
    });

    const { result } = renderHook(() => useChildOwnWishes('child-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load child wishes');
    expect(result.current.wishes).toEqual([]);
  });

  it('ignores stale responses when childId rapidly changes twice', async () => {
    let resolveFirst: (val: { data: ChildSafeWish[] | null; error: string | null }) => void;
    const firstPromise = new Promise<{ data: ChildSafeWish[] | null; error: string | null }>(
      (resolve) => {
        resolveFirst = resolve;
      }
    );

    let resolveSecond: (val: { data: ChildSafeWish[] | null; error: string | null }) => void;
    const secondPromise = new Promise<{ data: ChildSafeWish[] | null; error: string | null }>(
      (resolve) => {
        resolveSecond = resolve;
      }
    );

    const childAWishes: ChildSafeWish[] = [
      {
        id: 'w-a',
        wish_text: 'ბავშვი A სურვილი',
        status: 'wish_pending',
        wish_parent_note: null,
        correct_count: 40,
        created_at: '2026-09-29T09:00:00Z',
      },
    ];

    const childBWishes: ChildSafeWish[] = [
      {
        id: 'w-b',
        wish_text: 'ბავშვი B სურვილი',
        status: 'wish_pending',
        wish_parent_note: null,
        correct_count: 40,
        created_at: '2026-09-29T09:30:00Z',
      },
    ];

    const childCWishes: ChildSafeWish[] = [
      {
        id: 'w-c',
        wish_text: 'ბავშვი C სურვილი',
        status: 'wish_rejected',
        wish_parent_note: 'კომენტარი C',
        correct_count: 40,
        created_at: '2026-09-29T10:00:00Z',
      },
    ];

    vi.spyOn(supabaseSyncService, 'fetchChildSafeWishes').mockImplementation((id: string) => {
      if (id === 'child-A') {
        return firstPromise;
      }
      if (id === 'child-B') {
        return secondPromise;
      }
      return Promise.resolve({ data: childCWishes, error: null });
    });

    const { result, rerender } = renderHook(({ childId }) => useChildOwnWishes(childId), {
      initialProps: { childId: 'child-A' as string | null },
    });

    // Rapidly switch childId twice: child-A -> child-B -> child-C
    rerender({ childId: 'child-B' });
    rerender({ childId: 'child-C' });

    await waitFor(() => {
      expect(result.current.wishes).toEqual(childCWishes);
    });

    // Resolve the stale child-A and child-B requests after child-C has already settled
    await act(async () => {
      resolveFirst!({ data: childAWishes, error: null });
      resolveSecond!({ data: childBWishes, error: null });
    });

    expect(result.current.wishes).toEqual(childCWishes);
    expect(result.current.loading).toBe(false);
  });
});
