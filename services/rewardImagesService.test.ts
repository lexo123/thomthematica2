import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchChildRewardImages } from './rewardImagesService';
import * as supabaseModule from '../lib/supabase';

describe('rewardImagesService - fetchChildRewardImages', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty not-personalized state when childId is empty or supabase is null', async () => {
    const res1 = await fetchChildRewardImages('');
    expect(res1).toEqual({
      isPersonalized: false,
      winner: [],
      loser: [],
      super_winner: [],
    });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);
    const res2 = await fetchChildRewardImages('child-123');
    expect(res2).toEqual({
      isPersonalized: false,
      winner: [],
      loser: [],
      super_winner: [],
    });
  });

  it('returns empty state on DB query error without rejecting', async () => {
    const mockOrder2 = vi.fn().mockResolvedValue({ data: null, error: new Error('DB connection failed') });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: mockFrom,
    } as any);

    const result = await fetchChildRewardImages('child-123');
    expect(result).toEqual({
      isPersonalized: false,
      winner: [],
      loser: [],
      super_winner: [],
    });
  });

  it('returns empty state and skips storage call if DB has 0 rows', async () => {
    const mockCreateSignedUrls = vi.fn();
    const mockOrder2 = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mockSelect }),
      storage: {
        from: vi.fn().mockReturnValue({ createSignedUrls: mockCreateSignedUrls }),
      },
    } as any);

    const result = await fetchChildRewardImages('child-123');
    expect(result.isPersonalized).toBe(false);
    expect(mockCreateSignedUrls).not.toHaveBeenCalled();
  });

  it('enforces all-or-nothing: returns empty state if any category has 0 rows in DB', async () => {
    const mockCreateSignedUrls = vi.fn();
    const dbRows = [
      { id: '1', child_id: 'c1', category: 'winner', storage_path: 'c1/winner/w1.jpg', caption: 'Winner 1', sort_order: 0 },
      { id: '2', child_id: 'c1', category: 'loser', storage_path: 'c1/loser/l1.jpg', caption: 'Loser 1', sort_order: 0 },
      // super_winner is missing!
    ];

    const mockOrder2 = vi.fn().mockResolvedValue({ data: dbRows, error: null });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mockSelect }),
      storage: {
        from: vi.fn().mockReturnValue({ createSignedUrls: mockCreateSignedUrls }),
      },
    } as any);

    const result = await fetchChildRewardImages('c1');
    expect(result.isPersonalized).toBe(false);
    expect(result.winner).toEqual([]);
    expect(result.loser).toEqual([]);
    expect(result.super_winner).toEqual([]);
    expect(mockCreateSignedUrls).not.toHaveBeenCalled();
  });

  it('successfully maps rows to ImageConfig using non-positional Map and handles batch signed URLs', async () => {
    const dbRows = [
      { id: '1', child_id: 'c1', category: 'winner', storage_path: 'c1/winner/w1.jpg', caption: 'Winner One', sort_order: 1 },
      { id: '2', child_id: 'c1', category: 'winner', storage_path: 'c1/winner/w2.jpg', caption: 'Winner Two', sort_order: 2 },
      { id: '3', child_id: 'c1', category: 'loser', storage_path: 'c1/loser/l1.jpg', caption: 'Loser One', sort_order: 1 },
      { id: '4', child_id: 'c1', category: 'super_winner', storage_path: 'c1/super/s1.gif', caption: 'Super One', sort_order: 1 },
    ];

    const mockOrder2 = vi.fn().mockResolvedValue({ data: dbRows, error: null });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    // Return signed URLs out-of-order to verify Map matching by storage_path
    const mockSignedResponse = [
      { path: 'c1/super/s1.gif', signedUrl: 'https://storage/signed/s1.gif', error: null },
      { path: 'c1/winner/w2.jpg', signedUrl: 'https://storage/signed/w2.jpg', error: null },
      { path: 'c1/winner/w1.jpg', signedUrl: 'https://storage/signed/w1.jpg', error: null },
      { path: 'c1/loser/l1.jpg', signedUrl: 'https://storage/signed/l1.jpg', error: null },
    ];

    const mockCreateSignedUrls = vi.fn().mockResolvedValue({ data: mockSignedResponse, error: null });
    const mockStorageFrom = vi.fn().mockReturnValue({ createSignedUrls: mockCreateSignedUrls });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mockSelect }),
      storage: {
        from: mockStorageFrom,
      },
    } as any);

    const result = await fetchChildRewardImages('c1');

    expect(mockStorageFrom).toHaveBeenCalledWith('child-reward-images');
    expect(mockCreateSignedUrls).toHaveBeenCalledWith(
      ['c1/winner/w1.jpg', 'c1/winner/w2.jpg', 'c1/loser/l1.jpg', 'c1/super/s1.gif'],
      7200
    );

    expect(result.isPersonalized).toBe(true);
    expect(result.winner).toEqual([
      { url: 'https://storage/signed/w1.jpg', caption: 'Winner One' },
      { url: 'https://storage/signed/w2.jpg', caption: 'Winner Two' },
    ]);
    expect(result.loser).toEqual([
      { url: 'https://storage/signed/l1.jpg', caption: 'Loser One' },
    ]);
    expect(result.super_winner).toEqual([
      { url: 'https://storage/signed/s1.gif', caption: 'Super One' },
    ]);
  });

  it('skips individual failed path and maintains all-or-nothing if category empties', async () => {
    const dbRows = [
      { id: '1', child_id: 'c1', category: 'winner', storage_path: 'c1/winner/w1.jpg', caption: 'Winner One', sort_order: 1 },
      { id: '2', child_id: 'c1', category: 'loser', storage_path: 'c1/loser/l1.jpg', caption: 'Loser One', sort_order: 1 },
      { id: '3', child_id: 'c1', category: 'super_winner', storage_path: 'c1/super/s1.gif', caption: 'Super One', sort_order: 1 },
    ];

    const mockOrder2 = vi.fn().mockResolvedValue({ data: dbRows, error: null });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    // super_winner has an error in storage signed URL
    const mockSignedResponse = [
      { path: 'c1/winner/w1.jpg', signedUrl: 'https://storage/signed/w1.jpg', error: null },
      { path: 'c1/loser/l1.jpg', signedUrl: 'https://storage/signed/l1.jpg', error: null },
      { path: 'c1/super/s1.gif', signedUrl: null, error: 'Object not found' },
    ];

    const mockCreateSignedUrls = vi.fn().mockResolvedValue({ data: mockSignedResponse, error: null });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mockSelect }),
      storage: {
        from: vi.fn().mockReturnValue({ createSignedUrls: mockCreateSignedUrls }),
      },
    } as any);

    const result = await fetchChildRewardImages('c1');
    // Because super_winner became empty, all-or-nothing triggers
    expect(result.isPersonalized).toBe(false);
    expect(result.winner).toEqual([]);
    expect(result.loser).toEqual([]);
    expect(result.super_winner).toEqual([]);
  });
});
