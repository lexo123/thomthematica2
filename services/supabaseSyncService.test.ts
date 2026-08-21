import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncGameSessionToSupabase, syncWishToSupabase, fetchChildWishes, fetchChildSessions } from './supabaseSyncService';
import { GameMode } from '../types';
import * as supabaseModule from '../lib/supabase';

describe('supabaseSyncService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncGameSessionToSupabase', () => {
    it('returns error when childId is missing', async () => {
      const result = await syncGameSessionToSupabase({
        childId: '',
        mode: GameMode.Thomthematica,
        level: 1,
        correctCount: 10,
        incorrectCount: 2,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('childId is required');
    });

    it('returns error when Supabase client is not initialized', async () => {
      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);

      const result = await syncGameSessionToSupabase({
        childId: 'child-123',
        mode: GameMode.Thomthematica,
        level: 1,
        correctCount: 10,
        incorrectCount: 2,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase client is not available');
    });

    it('successfully inserts session data when Supabase is configured', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'session-123', child_id: 'child-123', correct_count: 10 },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await syncGameSessionToSupabase({
        childId: 'child-123',
        mode: GameMode.Thomthematica,
        level: 2,
        correctCount: 10,
        incorrectCount: 1,
      });

      expect(mockFrom).toHaveBeenCalledWith('game_sessions');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          child_id: 'child-123',
          mode: GameMode.Thomthematica,
          level: 2,
          correct_count: 10,
          incorrect_count: 1,
        })
      );
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('session-123');
    });
  });

  describe('syncWishToSupabase', () => {
    it('returns error when wishText is empty or whitespace', async () => {
      const result = await syncWishToSupabase({
        childId: 'child-123',
        wishText: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('wishText cannot be empty');
    });

    it('returns error when childId is missing', async () => {
      const result = await syncWishToSupabase({
        childId: '',
        wishText: 'LEGO Robot',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('childId is required');
    });

    it('successfully inserts wish when valid data provided', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'wish-123', wish_text: 'LEGO Robot', unlocked: true },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await syncWishToSupabase({
        childId: 'child-123',
        wishText: 'LEGO Robot',
      });

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          child_id: 'child-123',
          wish_text: 'LEGO Robot',
          unlocked: true,
        })
      );
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('wish-123');
    });
  });

  describe('fetchChildWishes and fetchChildSessions', () => {
    it('returns empty array when childId is empty', async () => {
      const wishes = await fetchChildWishes('');
      const sessions = await fetchChildSessions('');
      expect(wishes.data).toEqual([]);
      expect(sessions.data).toEqual([]);
    });
  });
});
