import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncGameSessionToSupabase,
  syncWishToSupabase,
  updateWishStatus,
  fetchChildWishes,
  fetchChildSessions,
  fetchChildSessionsForAggregate,
  fetchChildSessionsRecent,
} from './supabaseSyncService';
import { GameMode } from '../types';
import * as supabaseModule from '../lib/supabase';

describe('supabaseSyncService (Schema Alignment)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncGameSessionToSupabase', () => {
    it('returns error when childId is missing', async () => {
      const result = await syncGameSessionToSupabase({
        childId: '',
        gameMode: GameMode.Thomthematica,
        totalQuestions: 40,
        totalCorrect: 38,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('childId is required');
    });

    it('returns error when Supabase client is not initialized', async () => {
      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue(null);

      const result = await syncGameSessionToSupabase({
        childId: 'child-123',
        gameMode: GameMode.Thomthematica,
        totalQuestions: 40,
        totalCorrect: 38,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supabase client is not available');
    });

    it('successfully maps and inserts session data according to approved DB schema', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'session-123',
          child_id: 'child-123',
          game_mode: 'thomthematica',
          total_questions: 40,
          total_correct: 40,
          perfect_blocks_count: 4,
          duration_seconds: 120,
          status: 'completed',
        },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await syncGameSessionToSupabase({
        childId: 'child-123',
        gameMode: GameMode.Thomthematica,
        totalQuestions: 40,
        totalCorrect: 40,
        perfectBlocksCount: 4,
        durationSeconds: 120,
        status: 'completed',
      });

      expect(mockFrom).toHaveBeenCalledWith('game_sessions');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          child_id: 'child-123',
          game_mode: GameMode.Thomthematica,
          total_questions: 40,
          total_correct: 40,
          perfect_blocks_count: 4,
          duration_seconds: 120,
          status: 'completed',
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
        correctCount: 40,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('wishText cannot be empty');
    });

    it('returns error when childId is missing', async () => {
      const result = await syncWishToSupabase({
        childId: '',
        wishText: 'LEGO Robot',
        correctCount: 40,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('childId is required');
    });

    it('successfully maps and inserts wish matching schema constraints (correct_count: 39 | 40, status: pending)', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'wish-123',
          child_id: 'child-123',
          wish_text: 'LEGO Robot',
          correct_count: 40,
          status: 'pending',
          fulfilled_at: null,
          created_at: new Date().toISOString(),
        },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await syncWishToSupabase({
        childId: 'child-123',
        wishText: 'LEGO Robot',
        correctCount: 40,
        status: 'pending',
      });

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          child_id: 'child-123',
          wish_text: 'LEGO Robot',
          correct_count: 40,
          status: 'pending',
          fulfilled_at: null,
        })
      );
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('wish-123');
    });
  });

  describe('updateWishStatus', () => {
    it('updates wish status to fulfilled', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await updateWishStatus('wish-123', 'fulfilled');
      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fulfilled',
        })
      );
      expect(result.success).toBe(true);
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

  describe('fetchChildSessionsForAggregate', () => {
    it('returns empty array when childId is empty', async () => {
      const result = await fetchChildSessionsForAggregate('');
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('returns error when Supabase query returns an error', async () => {
      const mockEqStatus = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch aggregate' },
      });
      const mockEqChild = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqChild });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await fetchChildSessionsForAggregate('child-123');
      expect(mockFrom).toHaveBeenCalledWith('game_sessions');
      expect(mockSelect).toHaveBeenCalledWith('total_questions, total_correct, perfect_blocks_count, status');
      expect(mockEqChild).toHaveBeenCalledWith('child_id', 'child-123');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'completed');
      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to fetch aggregate');
    });

    it('returns correct data shape on successful fetch', async () => {
      const sampleData = [
        { total_questions: 40, total_correct: 38, perfect_blocks_count: 0, status: 'completed' },
        { total_questions: 40, total_correct: 40, perfect_blocks_count: 1, status: 'completed' },
      ];
      const mockEqStatus = vi.fn().mockResolvedValue({
        data: sampleData,
        error: null,
      });
      const mockEqChild = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqChild });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await fetchChildSessionsForAggregate('child-123');
      expect(result.error).toBeNull();
      expect(result.data).toEqual(sampleData);
    });
  });

  describe('fetchChildSessionsRecent', () => {
    it('returns empty array when childId is empty', async () => {
      const result = await fetchChildSessionsRecent('');
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('returns error when Supabase query returns an error', async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch recent sessions' },
      });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await fetchChildSessionsRecent('child-123', 10);
      expect(mockFrom).toHaveBeenCalledWith('game_sessions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('child_id', 'child-123');
      expect(mockOrder).toHaveBeenCalledWith('started_at', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to fetch recent sessions');
    });

    it('returns correct data shape on successful fetch with default and custom limits', async () => {
      const sampleSessions = [
        { id: 's1', child_id: 'child-123', game_mode: 'thomthematica', started_at: '2026-09-04T10:00:00Z' },
        { id: 's2', child_id: 'child-123', game_mode: 'kveshmicera', started_at: '2026-09-04T09:00:00Z' },
      ];
      const mockLimit = vi.fn().mockResolvedValue({
        data: sampleSessions,
        error: null,
      });
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await fetchChildSessionsRecent('child-123'); // default limit 20
      expect(mockLimit).toHaveBeenCalledWith(20);
      expect(result.error).toBeNull();
      expect(result.data).toEqual(sampleSessions);
    });
  });
});
