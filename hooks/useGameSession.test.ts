// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  gameSessionReducer,
  INITIAL_GAME_SESSION_STATE,
  GameSessionState,
  useGameSession,
  generateSessionId,
} from './useGameSession';
import { GameMode } from '../types';
import * as statsService from '../services/statsService';
import * as supabaseSyncService from '../services/supabaseSyncService';

describe('gameSessionReducer (40-question rolling window)', () => {
  it('should correctly store lastCompletedBlockCorrectCount for a 40/40 perfect block and reset window', () => {
    let state: GameSessionState = INITIAL_GAME_SESSION_STATE;

    // Simulate 40 correct answers
    for (let i = 0; i < 40; i++) {
      state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: true });
    }

    expect(state.totalQuestions).toBe(40);
    expect(state.totalCorrect).toBe(40);
    expect(state.recentAnswers.length).toBe(0); // Reset after wish qualified
    expect(state.questionsInBlock40).toBe(0);
    expect(state.correctInBlock40).toBe(0);
    expect(state.lastCompletedBlockCorrectCount).toBe(40); // Preserved!
    expect(state.perfectBlocksCount).toBe(1);
  });

  it('should correctly trigger for 39/40 block and store 39', () => {
    let state: GameSessionState = INITIAL_GAME_SESSION_STATE;

    // 39 correct answers, 1 incorrect
    for (let i = 0; i < 39; i++) {
      state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: true });
    }
    state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: false });

    expect(state.totalQuestions).toBe(40);
    expect(state.totalCorrect).toBe(39);
    expect(state.recentAnswers.length).toBe(0); // Reset after wish qualified
    expect(state.lastCompletedBlockCorrectCount).toBe(39);
    expect(state.perfectBlocksCount).toBe(0);
  });

  it('should NOT trigger wish modal for 38/40 block and keep sliding window open', () => {
    let state: GameSessionState = INITIAL_GAME_SESSION_STATE;

    // 38 correct answers, 2 incorrect
    for (let i = 0; i < 38; i++) {
      state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: true });
    }
    for (let i = 0; i < 2; i++) {
      state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: false });
    }

    expect(state.totalQuestions).toBe(40);
    expect(state.totalCorrect).toBe(38);
    // Not qualified, so window stays at 40 to slide with next answers
    expect(state.recentAnswers.length).toBe(40);
    expect(state.lastCompletedBlockCorrectCount).toBe(0);
  });

  it('should trigger wish on any consecutive 40-question window', () => {
    let state: GameSessionState = INITIAL_GAME_SESSION_STATE;

    // Q1..Q13: correct (13)
    for (let i = 0; i < 13; i++) {
      state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: true });
    }
    // Q14, Q15: incorrect (2)
    state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: false });
    state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: false });

    // Q16..Q54: 39 correct answers in a row
    for (let i = 0; i < 39; i++) {
      state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: true });
    }
    expect(state.totalQuestions).toBe(54);
    expect(state.lastCompletedBlockCorrectCount).toBe(39);
    expect(state.recentAnswers.length).toBe(0);
  });

  it('should handle wish submission lifecycle correctly', () => {
    let state: GameSessionState = {
      ...INITIAL_GAME_SESSION_STATE,
      wishText: 'I want a dragon picture',
      showWishModal: true,
    };

    state = gameSessionReducer(state, { type: 'SUBMIT_WISH_START' });
    expect(state.wishSubmitting).toBe(true);
    expect(state.wishError).toBeNull();

    let errorState = gameSessionReducer(state, { type: 'SUBMIT_WISH_ERROR', error: 'Network error' });
    expect(errorState.wishSubmitting).toBe(false);
    expect(errorState.wishError).toBe('Network error');

    let successState = gameSessionReducer(state, { type: 'SUBMIT_WISH_SUCCESS' });
    expect(successState.wishSubmitting).toBe(false);
    expect(successState.wishSubmitted).toBe(true);
    expect(successState.showWishModal).toBe(false);
    expect(successState.wishText).toBe('');
  });
});

describe('useGameSession (Phase 2.3 Supabase & Guest Sync)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a unique valid sessionId on creation', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('Guest mode (childId === null): syncs to Google Sheets and NOT to Supabase on session end', () => {
    const sendGameStatsSpy = vi.spyOn(statsService, 'sendGameStats').mockResolvedValue(true as any);
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    const { result, unmount } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: null } }
    );

    act(() => {
      result.current.recordAnswer(true);
      result.current.recordAnswer(true);
    });

    expect(result.current.totalQuestions).toBe(2);
    expect(result.current.totalCorrect).toBe(2);

    unmount();

    expect(sendGameStatsSpy).toHaveBeenCalledWith(GameMode.Thomthematica, 2, 2);
    expect(syncGameSessionSpy).not.toHaveBeenCalled();
  });

  it('Authenticated mode (childId !== null): syncs to Supabase and NOT to Google Sheets', () => {
    const sendGameStatsSpy = vi.spyOn(statsService, 'sendGameStats').mockResolvedValue(true as any);
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    const { result, unmount } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: 'child-abc' } }
    );

    act(() => {
      result.current.recordAnswer(true);
    });

    const currentSessionId = result.current.sessionId;
    expect(currentSessionId).toBeTruthy();

    unmount();

    expect(syncGameSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: currentSessionId,
        childId: 'child-abc',
        gameMode: GameMode.Thomthematica,
        totalQuestions: 1,
        totalCorrect: 1,
        status: 'completed',
      })
    );
    expect(sendGameStatsSpy).not.toHaveBeenCalled();
  });

  it('Auto-save triggers every 10 questions with status: active and identical sessionId', () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    const { result, unmount } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: 'child-abc' } }
    );

    const initialSessionId = result.current.sessionId;

    // Answer 10 questions
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.recordAnswer(true);
      }
    });

    expect(result.current.totalQuestions).toBe(10);
    expect(syncGameSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: initialSessionId,
        childId: 'child-abc',
        totalQuestions: 10,
        totalCorrect: 10,
        status: 'active',
      })
    );

    // Answer 5 more questions (total 15)
    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.recordAnswer(true);
      }
    });

    // Unmount -> status: completed with SAME sessionId
    unmount();

    expect(syncGameSessionSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: initialSessionId,
        childId: 'child-abc',
        totalQuestions: 15,
        totalCorrect: 15,
        status: 'completed',
      })
    );
  });

  it('resetSession() flushes previous session and generates a new distinct sessionId', () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    const { result } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: 'child-abc' } }
    );

    const session1Id = result.current.sessionId;

    act(() => {
      result.current.recordAnswer(true);
      result.current.recordAnswer(false);
    });

    act(() => {
      result.current.resetSession();
    });

    expect(syncGameSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: session1Id,
        childId: 'child-abc',
        totalQuestions: 2,
        totalCorrect: 1,
        status: 'completed',
      })
    );

    const session2Id = result.current.sessionId;
    expect(session2Id).toBeTruthy();
    expect(session2Id).not.toBe(session1Id);
    expect(result.current.totalQuestions).toBe(0);
  });

  it('Child switch (childId change) flushes old child session as completed and starts new session for new child', () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    const { result, rerender, unmount } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: 'child-1' } }
    );

    const child1SessionId = result.current.sessionId;

    act(() => {
      result.current.recordAnswer(true);
      result.current.recordAnswer(true);
    });

    // Switch to child-2
    rerender({ mode: GameMode.Thomthematica, childId: 'child-2' });

    expect(syncGameSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: child1SessionId,
        childId: 'child-1',
        totalQuestions: 2,
        totalCorrect: 2,
        status: 'completed',
      })
    );

    const child2SessionId = result.current.sessionId;
    expect(child2SessionId).not.toBe(child1SessionId);
    expect(result.current.totalQuestions).toBe(0);

    act(() => {
      result.current.recordAnswer(true);
    });

    unmount();

    expect(syncGameSessionSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: child2SessionId,
        childId: 'child-2',
        totalQuestions: 1,
        totalCorrect: 1,
        status: 'completed',
      })
    );
  });

  it('Guest -> Authenticated mid-session transition (Rule d): keeps ongoing session in Guest mode', () => {
    const sendGameStatsSpy = vi.spyOn(statsService, 'sendGameStats').mockResolvedValue(true as any);
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    const { result, rerender, unmount } = renderHook(
      ({ mode, childId }: { mode: GameMode; childId: string | null }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: null } }
    );

    // Guest plays 3 questions
    act(() => {
      result.current.recordAnswer(true);
      result.current.recordAnswer(true);
      result.current.recordAnswer(false);
    });

    // Parent logs in mid-game (childId becomes 'child-new')
    rerender({ mode: GameMode.Thomthematica, childId: 'child-new' });

    // Session completes
    unmount();

    // Ongoing guest session completed via Google Sheets, NOT Supabase
    expect(sendGameStatsSpy).toHaveBeenCalledWith(GameMode.Thomthematica, 3, 2);
    expect(syncGameSessionSpy).not.toHaveBeenCalled();
  });

  it('Supabase sync network errors are caught gracefully and do not crash the game', async () => {
    vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockRejectedValue(new Error('Network offline'));

    const { result } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: 'child-abc' } }
    );

    // Trigger auto-save at 10 questions
    expect(() => {
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.recordAnswer(true);
        }
      });
    }).not.toThrow();

    expect(result.current.totalQuestions).toBe(10);
  });

  it('Wish submit delegates to syncWishToSupabase for authenticated child and sendWish for Guest', async () => {
    const syncWishSpy = vi.spyOn(supabaseSyncService, 'syncWishToSupabase').mockResolvedValue({ success: true } as any);
    const sendWishSpy = vi.spyOn(statsService, 'sendWish').mockResolvedValue(true);

    // 1. Authenticated
    const { result: authHook } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: 'child-abc' } }
    );

    act(() => {
      authHook.current.setWishText('LEGO Set');
    });

    await act(async () => {
      await authHook.current.handleWishSubmit();
    });

    expect(syncWishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-abc',
        wishText: 'LEGO Set',
      })
    );
    expect(sendWishSpy).not.toHaveBeenCalled();

    // 2. Guest
    const { result: guestHook } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: null } }
    );

    act(() => {
      guestHook.current.setWishText('Robot Toy');
    });

    await act(async () => {
      await guestHook.current.handleWishSubmit();
    });

    expect(sendWishSpy).toHaveBeenCalledWith('Robot Toy', 0);
  });
});

