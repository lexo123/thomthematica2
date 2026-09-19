// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChildRewardImagesFetcher } from './useChildRewardImagesFetcher';
import * as rewardImagesService from '../services/rewardImagesService';
import { ChildRewardImagesState } from '../types';

describe('useChildRewardImagesFetcher', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null immediately when childId is null and does not call fetch', () => {
    const fetchSpy = vi.spyOn(rewardImagesService, 'fetchChildRewardImages');
    const { result } = renderHook(() => useChildRewardImagesFetcher(null));

    expect(result.current).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns fetched personalized state when childId is provided', async () => {
    const mockState: ChildRewardImagesState = {
      isPersonalized: true,
      winner: [{ url: 'https://url/w1', caption: 'Winner' }],
      loser: [{ url: 'https://url/l1', caption: 'Loser' }],
      super_winner: [{ url: 'https://url/s1', caption: 'Super' }],
    };

    vi.spyOn(rewardImagesService, 'fetchChildRewardImages').mockResolvedValue(mockState);

    const { result } = renderHook(() => useChildRewardImagesFetcher('child-1'));

    // Initially null while in flight
    expect(result.current).toBeNull();

    await waitFor(() => {
      expect(result.current).toEqual(mockState);
    });
  });

  it('prevents in-flight race condition when childId quickly changes (requestIdRef guard)', async () => {
    let resolveFirst: (val: ChildRewardImagesState) => void;
    const firstPromise = new Promise<ChildRewardImagesState>((res) => {
      resolveFirst = res;
    });

    const secondState: ChildRewardImagesState = {
      isPersonalized: true,
      winner: [{ url: 'https://url/child2-w1', caption: 'Child 2 Winner' }],
      loser: [{ url: 'https://url/child2-l1', caption: 'Child 2 Loser' }],
      super_winner: [{ url: 'https://url/child2-s1', caption: 'Child 2 Super' }],
    };

    const fetchSpy = vi.spyOn(rewardImagesService, 'fetchChildRewardImages').mockImplementation((id: string) => {
      if (id === 'child-1') return firstPromise;
      return Promise.resolve(secondState);
    });

    const { result, rerender } = renderHook(({ id }) => useChildRewardImagesFetcher(id), {
      initialProps: { id: 'child-1' },
    });

    expect(result.current).toBeNull();

    // Rerender with child-2 before child-1 resolves
    rerender({ id: 'child-2' });

    // Wait for child-2 to resolve
    await waitFor(() => {
      expect(result.current).toEqual(secondState);
    });

    // Now resolve child-1 late
    const staleState: ChildRewardImagesState = {
      isPersonalized: true,
      winner: [{ url: 'https://url/child1-stale', caption: 'Child 1 Stale' }],
      loser: [{ url: 'https://url/child1-stale', caption: 'Child 1 Stale' }],
      super_winner: [{ url: 'https://url/child1-stale', caption: 'Child 1 Stale' }],
    };
    resolveFirst!(staleState);

    // State should remain child-2 and NOT be overwritten by stale child-1 response
    expect(result.current).toEqual(secondState);
  });

  it('handles service errors gracefully by setting not-personalized state', async () => {
    vi.spyOn(rewardImagesService, 'fetchChildRewardImages').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChildRewardImagesFetcher('child-error'));

    await waitFor(() => {
      expect(result.current).toEqual({
        isPersonalized: false,
        winner: [],
        loser: [],
        super_winner: [],
      });
    });
  });
});
