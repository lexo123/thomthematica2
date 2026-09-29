import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncGameSessionToSupabase,
  syncWishToSupabase,
  childResubmitWish,
  parentApproveWish,
  parentRejectWish,
  parentApproveImage,
  parentRejectImage,
  fetchChildSafeWishes,
  fetchChildWishes,
  fetchChildSessions,
  fetchChildSessionsForAggregate,
  fetchChildSessionsRecent,
  fetchChildSessionsGameModeBreakdown,
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

    it('returns error when keepalive transport is used without an accessToken', async () => {
      const result = await syncGameSessionToSupabase(
        {
          childId: 'child-123',
          gameMode: GameMode.Thomthematica,
          totalQuestions: 10,
          totalCorrect: 10,
        },
        { transport: 'keepalive' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('No cached access token available for keepalive sync');
    });

    it('uses fetch with keepalive: true when keepalive transport is specified with accessToken', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 201,
      } as any);

      const result = await syncGameSessionToSupabase(
        {
          id: 'sess-abc',
          childId: 'child-123',
          gameMode: GameMode.Thomthematica,
          totalQuestions: 10,
          totalCorrect: 9,
          status: 'completed',
        },
        { transport: 'keepalive', accessToken: 'test-token-123' }
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/rest/v1/game_sessions'),
        expect.objectContaining({
          method: 'POST',
          keepalive: true,
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          }),
          body: expect.stringContaining('"child_id":"child-123"'),
        })
      );
      expect(result.success).toBe(true);
    });

    it('returns error when keepalive fetch fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      const result = await syncGameSessionToSupabase(
        {
          childId: 'child-123',
          gameMode: GameMode.Thomthematica,
          totalQuestions: 5,
          totalCorrect: 5,
        },
        { transport: 'keepalive', accessToken: 'test-token-123' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('keepalive sync failed: 500');
    });

    it('returns error when keepalive fetch throws exception', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await syncGameSessionToSupabase(
        {
          childId: 'child-123',
          gameMode: GameMode.Thomthematica,
          totalQuestions: 5,
          totalCorrect: 5,
        },
        { transport: 'keepalive', accessToken: 'test-token-123' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
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

    it('successfully maps and inserts wish matching schema constraints (correct_count: 39 | 40, status: wish_pending)', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'wish-123',
          child_id: 'child-123',
          wish_text: 'LEGO Robot',
          correct_count: 40,
          status: 'wish_pending',
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
        status: 'wish_pending',
      });

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          child_id: 'child-123',
          wish_text: 'LEGO Robot',
          correct_count: 40,
          status: 'wish_pending',
          fulfilled_at: null,
        })
      );
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('wish-123');
    });

    it('defaults status to wish_pending when status is not provided in payload', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'wish-default-status',
          child_id: 'child-123',
          wish_text: 'Default Status Wish',
          correct_count: 40,
          status: 'wish_pending',
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
        wishText: 'Default Status Wish',
        correctCount: 40,
      });

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          child_id: 'child-123',
          wish_text: 'Default Status Wish',
          correct_count: 40,
          status: 'wish_pending',
          fulfilled_at: null,
        })
      );
      expect(result.success).toBe(true);
    });

    it('successfully maps and allows correct_count 19 and 20 for Kveshmicera blocks', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'wish-20',
          child_id: 'child-123',
          wish_text: 'Kveshmicera Wish',
          correct_count: 20,
          status: 'wish_pending',
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

      const result20 = await syncWishToSupabase({
        childId: 'child-123',
        wishText: 'Kveshmicera Wish 20',
        correctCount: 20,
        status: 'wish_pending',
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          correct_count: 20,
        })
      );
      expect(result20.success).toBe(true);

      const result19 = await syncWishToSupabase({
        childId: 'child-123',
        wishText: 'Kveshmicera Wish 19',
        correctCount: 19,
        status: 'wish_pending',
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          correct_count: 19,
        })
      );
      expect(result19.success).toBe(true);
    });
  });

  describe('childResubmitWish', () => {
    it('successfully resubmits rejected wish with trimmed wish_text, status: wish_pending, and wish_parent_note: null across full .update().eq().eq().eq().select() chain', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'wish-1', child_id: 'child-1', wish_text: 'ახალი სურვილი', status: 'wish_pending', wish_parent_note: null }],
        error: null,
      });
      const mockEqStatus = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqChildId = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqChildId });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await childResubmitWish('wish-1', 'child-1', '  ახალი სურვილი  ');

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockUpdate).toHaveBeenCalledWith({
        wish_text: 'ახალი სურვილი',
        status: 'wish_pending',
        wish_parent_note: null,
      });
      expect(mockEqId).toHaveBeenCalledWith('id', 'wish-1');
      expect(mockEqChildId).toHaveBeenCalledWith('child_id', 'child-1');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'wish_rejected');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it('fails with clear error when expected-status guard (status=wish_rejected) or child_id guard updates 0 rows', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockEqStatus = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqChildId = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqChildId });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await childResubmitWish('wish-1', 'child-1', 'ახალი სურვილი');

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockUpdate).toHaveBeenCalledWith({
        wish_text: 'ახალი სურვილი',
        status: 'wish_pending',
        wish_parent_note: null,
      });
      expect(mockEqId).toHaveBeenCalledWith('id', 'wish-1');
      expect(mockEqChildId).toHaveBeenCalledWith('child_id', 'child-1');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'wish_rejected');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: false,
        error: 'Wish is not in a rejectable state or does not belong to this child',
      });
    });

    it('returns error when newWishText is empty or whitespace without calling Supabase update', async () => {
      const mockFrom = vi.fn();
      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await childResubmitWish('wish-1', 'child-1', '   ');
      expect(result).toEqual({ success: false, error: 'Wish text is required' });
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('parentApproveWish', () => {
    it('successfully approves a wish in wish_pending state via .update().eq().eq().select()', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'wish-10', status: 'wish_approved' }],
        error: null,
      });
      const mockEqStatus = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await parentApproveWish('wish-10');

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'wish_approved' });
      expect(mockEqId).toHaveBeenCalledWith('id', 'wish-10');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'wish_pending');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it('fails when expected-status guard (status=wish_pending) matches 0 rows', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockEqStatus = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await parentApproveWish('wish-10');

      expect(mockEqId).toHaveBeenCalledWith('id', 'wish-10');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'wish_pending');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: false, error: 'Wish is no longer pending' });
    });
  });

  describe('parentRejectWish', () => {
    it('successfully rejects a wish in wish_pending state with wish_parent_note via .update().eq().eq().select()', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'wish-20', status: 'wish_rejected', wish_parent_note: 'სხვა სურვილი მოიფიქრე' }],
        error: null,
      });
      const mockEqStatus = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await parentRejectWish('wish-20', 'სხვა სურვილი მოიფიქრე');

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'wish_rejected',
        wish_parent_note: 'სხვა სურვილი მოიფიქრე',
      });
      expect(mockEqId).toHaveBeenCalledWith('id', 'wish-20');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'wish_pending');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it('fails when expected-status guard (status=wish_pending) matches 0 rows', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockEqStatus = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await parentRejectWish('wish-20', null);

      expect(mockEqId).toHaveBeenCalledWith('id', 'wish-20');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'wish_pending');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: false, error: 'Wish is no longer pending' });
    });
  });

  describe('parentApproveImage', () => {
    it('successfully approves image on wish in image_pending state via .update().eq().eq().select()', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'wish-30', status: 'image_approved' }],
        error: null,
      });
      const mockEqStatus = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await parentApproveImage('wish-30');

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'image_approved' });
      expect(mockEqId).toHaveBeenCalledWith('id', 'wish-30');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'image_pending');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it('fails when expected-status guard (status=image_pending) matches 0 rows', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockEqStatus = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await parentApproveImage('wish-30');

      expect(mockEqId).toHaveBeenCalledWith('id', 'wish-30');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'image_pending');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: false, error: 'Wish is no longer awaiting image review' });
    });
  });

  describe('parentRejectImage', () => {
    it('successfully rejects image on wish in image_pending state and clears proposed_image_path via .update().eq().eq().select()', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: 'wish-40', status: 'image_rejected', image_parent_note: 'სურათი შეუსაბამოა', proposed_image_path: null }],
        error: null,
      });
      const mockEqStatus = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await parentRejectImage('wish-40', 'სურათი შეუსაბამოა');

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'image_rejected',
        image_parent_note: 'სურათი შეუსაბამოა',
        proposed_image_path: null,
      });
      expect(mockEqId).toHaveBeenCalledWith('id', 'wish-40');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'image_pending');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: true });
    });

    it('fails when expected-status guard (status=image_pending) matches 0 rows', async () => {
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockEqStatus = vi.fn().mockReturnValue({ select: mockSelect });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await parentRejectImage('wish-40', null);

      expect(mockEqId).toHaveBeenCalledWith('id', 'wish-40');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'image_pending');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ success: false, error: 'Wish is no longer awaiting image review' });
    });
  });

  describe('fetchChildSafeWishes', () => {
    it('selects only child-safe columns (excluding *, proposed_image_path, and image_parent_note) and returns wishes ordered by created_at DESC', async () => {
      const sampleSafeWishes = [
        {
          id: 'wish-safe-1',
          wish_text: 'LEGO',
          status: 'wish_pending',
          wish_parent_note: null,
          correct_count: 40,
          created_at: '2026-09-29T10:00:00Z',
        },
      ];
      const mockOrder = vi.fn().mockResolvedValue({
        data: sampleSafeWishes,
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await fetchChildSafeWishes('child-123');

      expect(mockFrom).toHaveBeenCalledWith('wishes');
      expect(mockSelect).toHaveBeenCalledTimes(1);
      const selectArg = mockSelect.mock.calls[0][0] as string;
      expect(selectArg).toBe('id, wish_text, status, wish_parent_note, correct_count, created_at');
      expect(selectArg).not.toBe('*');
      expect(selectArg).not.toContain('*');
      expect(selectArg).not.toContain('proposed_image_path');
      expect(selectArg).not.toContain('image_parent_note');
      expect(mockEq).toHaveBeenCalledWith('child_id', 'child-123');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual({ data: sampleSafeWishes, error: null });
    });

    it('returns error when Supabase query fails or client is not configured, and returns empty array for empty childId', async () => {
      const emptyResult = await fetchChildSafeWishes('');
      expect(emptyResult).toEqual({ data: [], error: null });

      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch child-safe wishes' },
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const errorResult = await fetchChildSafeWishes('child-123');
      expect(errorResult).toEqual({ data: null, error: 'Failed to fetch child-safe wishes' });
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

  describe('fetchChildSessionsGameModeBreakdown', () => {
    it('returns empty array when childId is empty', async () => {
      const result = await fetchChildSessionsGameModeBreakdown('');
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('returns error when Supabase query returns an error', async () => {
      const mockEqStatus = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch game mode breakdown' },
      });
      const mockEqChild = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqChild });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
        from: mockFrom,
      } as any);

      const result = await fetchChildSessionsGameModeBreakdown('child-123');
      expect(mockFrom).toHaveBeenCalledWith('game_sessions');
      expect(mockSelect).toHaveBeenCalledWith('game_mode, total_questions, total_correct, status');
      expect(mockEqChild).toHaveBeenCalledWith('child_id', 'child-123');
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'completed');
      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to fetch game mode breakdown');
    });

    it('returns correct data shape on successful fetch', async () => {
      const sampleData = [
        { game_mode: 'thomthematica', total_questions: 40, total_correct: 38, status: 'completed' },
        { game_mode: 'gethometria', total_questions: 20, total_correct: 20, status: 'completed' },
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

      const result = await fetchChildSessionsGameModeBreakdown('child-123');
      expect(result.error).toBeNull();
      expect(result.data).toEqual(sampleData);
    });
  });
});
