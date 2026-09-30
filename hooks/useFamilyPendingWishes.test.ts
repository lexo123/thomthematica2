// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFamilyPendingWishes } from './useFamilyPendingWishes';
import * as supabaseSyncService from '../services/supabaseSyncService';
import { Wish } from '../types';

describe('useFamilyPendingWishes Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('remains idle without calling fetchFamilyPendingWishes when enabled is false', async () => {
    const fetchSpy = vi.spyOn(supabaseSyncService, 'fetchFamilyPendingWishes');

    const { result } = renderHook(() => useFamilyPendingWishes(false));

    expect(result.current.wishes).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('calls fetchFamilyPendingWishes and returns pending wishes when enabled is true', async () => {
    const mockWishes: Wish[] = [
      {
        id: 'w-1',
        child_id: 'child-1',
        wish_text: 'LEGO Robot',
        correct_count: 40,
        status: 'wish_pending',
        proposed_image_path: null,
        created_at: '2026-09-29T08:00:00Z',
      },
      {
        id: 'w-2',
        child_id: 'child-2',
        wish_text: 'ველოსიპედი',
        correct_count: 20,
        status: 'image_pending',
        proposed_image_path: 'child-2/winner/bike.png',
        created_at: '2026-09-29T09:00:00Z',
      },
    ];

    const fetchSpy = vi
      .spyOn(supabaseSyncService, 'fetchFamilyPendingWishes')
      .mockResolvedValue({ data: mockWishes, error: null });

    const { result } = renderHook(() => useFamilyPendingWishes(true));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.wishes).toEqual(mockWishes);
  });

  it('sets error and clears wishes when fetchFamilyPendingWishes returns an error', async () => {
    vi.spyOn(supabaseSyncService, 'fetchFamilyPendingWishes').mockResolvedValue({
      data: null,
      error: 'Database error fetching pending wishes',
    });

    const { result } = renderHook(() => useFamilyPendingWishes(true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Database error fetching pending wishes');
    expect(result.current.wishes).toEqual([]);
  });

  it('ignores stale out-of-order responses using requestIdRef generation counter', async () => {
    let resolveFirstFetch: (val: { data: Wish[] | null; error: string | null }) => void;
    const firstFetchPromise = new Promise<{ data: Wish[] | null; error: string | null }>((resolve) => {
      resolveFirstFetch = resolve;
    });

    const freshWishes: Wish[] = [
      {
        id: 'wish-fresh',
        child_id: 'child-1',
        wish_text: 'ახალი სურვილი',
        correct_count: 40,
        status: 'wish_pending',
        proposed_image_path: null,
        created_at: '2026-09-29T12:00:00Z',
      },
    ];

    const staleWishes: Wish[] = [
      {
        id: 'wish-stale',
        child_id: 'child-1',
        wish_text: 'ძველი სურვილი',
        correct_count: 40,
        status: 'wish_pending',
        proposed_image_path: null,
        created_at: '2026-09-29T08:00:00Z',
      },
    ];

    let callCount = 0;
    vi.spyOn(supabaseSyncService, 'fetchFamilyPendingWishes').mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return firstFetchPromise;
      }
      return Promise.resolve({ data: freshWishes, error: null });
    });

    const { result, rerender } = renderHook(({ enabled }) => useFamilyPendingWishes(enabled), {
      initialProps: { enabled: true },
    });

    // Toggle enabled true -> false -> true to trigger a second request while first is still in-flight
    rerender({ enabled: false });
    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.wishes).toEqual(freshWishes);
    });

    // Resolve the stale first request after the second request has already settled
    await act(async () => {
      resolveFirstFetch!({ data: staleWishes, error: null });
    });

    // Stale response is ignored; freshWishes remain
    expect(result.current.wishes).toEqual(freshWishes);
    expect(result.current.loading).toBe(false);
  });
});
