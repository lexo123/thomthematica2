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

  it('Authenticated mode (childId !== null): syncs to Supabase on session unmount', async () => {
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
    await act(async () => {
      await Promise.resolve();
    });

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
  });

  it('Auto-save triggers every 10 questions with status: active and identical sessionId', async () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    const { result, unmount } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: 'child-abc' } }
    );

    const initialSessionId = result.current.sessionId;

    // Answer 10 questions
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        result.current.recordAnswer(true);
      }
      await Promise.resolve();
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
    await act(async () => {
      await Promise.resolve();
    });

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

  it('resetSession() flushes previous session and generates a new distinct sessionId', async () => {
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

    await act(async () => {
      result.current.resetSession();
      await Promise.resolve();
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

  it('Child switch (childId change) flushes old child session as completed and starts new session for new child', async () => {
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
    await act(async () => {
      rerender({ mode: GameMode.Thomthematica, childId: 'child-2' });
      await Promise.resolve();
    });

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
    await act(async () => {
      await Promise.resolve();
    });

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

  it('Wish submit delegates to syncWishToSupabase for authenticated child', async () => {
    const syncWishSpy = vi.spyOn(supabaseSyncService, 'syncWishToSupabase').mockResolvedValue({ success: true } as any);

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
  });

  it('handles child profile change (childId: "child-abc" -> "child-def"): flushes old session as completed and starts new session', async () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    const { result, rerender, unmount } = renderHook(
      ({ mode, childId }: { mode: GameMode; childId: string | null }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: 'child-abc' } }
    );

    const oldAuthSessionId = result.current.sessionId;

    act(() => {
      result.current.recordAnswer(true);
      result.current.recordAnswer(true);
    });

    // Child profile changed mid-session
    await act(async () => {
      rerender({ mode: GameMode.Thomthematica, childId: 'child-def' });
      await Promise.resolve();
    });

    // Old authenticated session was flushed to Supabase with status: 'completed'
    expect(syncGameSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: oldAuthSessionId,
        childId: 'child-abc',
        totalQuestions: 2,
        totalCorrect: 2,
        status: 'completed',
      })
    );

    // New session started with new sessionId and 0 questions
    const newSessionId = result.current.sessionId;
    expect(newSessionId).not.toBe(oldAuthSessionId);
    expect(result.current.totalQuestions).toBe(0);

    // New child answers 1 question and unmounts
    act(() => {
      result.current.recordAnswer(true);
    });

    unmount();
    await act(async () => {
      await Promise.resolve();
    });

    expect(syncGameSessionSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: newSessionId,
        childId: 'child-def',
        gameMode: GameMode.Thomthematica,
        totalQuestions: 1,
        totalCorrect: 1,
        status: 'completed',
      })
    );
  });

  it('guarantees sequential FIFO execution of Supabase session syncs even if auto-save is delayed', async () => {
    const callOrder: string[] = [];
    let resolveAutoSavePromise: () => void = () => {};

    const delayedAutoSavePromise = new Promise<{ success: boolean }>((resolve) => {
      resolveAutoSavePromise = () => {
        callOrder.push('auto-save-resolved');
        resolve({ success: true });
      };
    });

    vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockImplementation((session) => {
      if (session.status === 'active') {
        callOrder.push('auto-save-called');
        return delayedAutoSavePromise;
      }
      if (session.status === 'completed') {
        callOrder.push('completed-called');
        return Promise.resolve({ success: true } as any);
      }
      return Promise.resolve({ success: true } as any);
    });

    const { result, unmount } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: 'child-abc' } }
    );

    // 1. Trigger auto-save at 10 questions
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        result.current.recordAnswer(true);
      }
      await Promise.resolve();
    });

    expect(callOrder).toEqual(['auto-save-called']);

    // 2. Trigger completed sync immediately (e.g. unmount) before auto-save resolves
    unmount();

    // Because of FIFO queue, 'completed-called' is chained and waits for auto-save to resolve
    expect(callOrder).toEqual(['auto-save-called']);

    // 3. Resolve the auto-save promise
    await act(async () => {
      resolveAutoSavePromise();
      // Allow promise microtasks to flush
      await Promise.resolve();
      await Promise.resolve();
    });

    // The final order is strictly auto-save-called -> auto-save-resolved -> completed-called
    expect(callOrder).toEqual(['auto-save-called', 'auto-save-resolved', 'completed-called']);
  });

  it('accurately calculates active play duration using Page Visibility API (excluding background/hidden time)', async () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    // Mock Date.now to control time progression
    let currentTime = 1000000;
    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

    // Mock document.visibilityState
    let mockVisibilityState: DocumentVisibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      get: () => mockVisibilityState,
      configurable: true,
    });

    const { result, unmount } = renderHook(
      ({ mode, childId }) => useGameSession(mode, childId),
      { initialProps: { mode: GameMode.Thomthematica, childId: 'child-abc' } }
    );

    // 1. Play active for 5 seconds (5000ms)
    act(() => {
      result.current.recordAnswer(true);
    });
    currentTime += 5000; // 5s active

    // 2. Child switches tab / background -> hidden for 20 minutes (1200000ms)
    act(() => {
      mockVisibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    currentTime += 1200000; // 20 mins hidden in background

    // 3. Child returns to tab -> visible
    act(() => {
      mockVisibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // 4. Play active for 9 more questions over 7 seconds (7000ms) -> triggers auto-save at 10 total
    currentTime += 7000; // 7s active

    await act(async () => {
      for (let i = 0; i < 9; i++) {
        result.current.recordAnswer(true);
      }
      await Promise.resolve();
    });

    // Total active play time so far = 5s + 7s = 12s (background 1200s is completely excluded)
    expect(result.current.totalQuestions).toBe(10);
    expect(syncGameSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-abc',
        totalQuestions: 10,
        durationSeconds: 12,
        status: 'active',
      })
    );

    // 5. Play 3 more seconds active (3000ms) and finish session (unmount)
    currentTime += 3000; // 3s active

    unmount();
    await act(async () => {
      await Promise.resolve();
    });

    // Total final active duration = 12s + 3s = 15s (Wall-clock was 1215s!)
    expect(syncGameSessionSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        childId: 'child-abc',
        totalQuestions: 10,
        durationSeconds: 15,
        status: 'completed',
      })
    );
  });

  it('authenticated user + unchanged childId (modeChanged === true, childChanged === false): flushes old mode session and starts new mode session under same childId without double flush', async () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    const { result, rerender } = renderHook(
      ({ mode, childId }: { mode: GameMode | null; childId: string | null }) =>
        useGameSession(mode, childId),
      {
        initialProps: {
          mode: GameMode.Thomthematica,
          childId: 'child-persistent-1',
        },
      }
    );

    const initialSessionId = result.current.sessionId;

    // 1. Play 2 questions in Thomthematica as child-persistent-1
    act(() => {
      result.current.recordAnswer(true);
      result.current.recordAnswer(false);
    });

    expect(result.current.totalQuestions).toBe(2);
    expect(result.current.totalCorrect).toBe(1);

    // 2. Mode switch to Kveshmicera with SAME childId ('child-persistent-1')
    act(() => {
      rerender({
        mode: GameMode.Kveshmicera,
        childId: 'child-persistent-1',
      });
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // 3. Verify old session (Thomthematica) was flushed exactly once to Supabase
    expect(syncGameSessionSpy).toHaveBeenCalledTimes(1);
    expect(syncGameSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: initialSessionId,
        childId: 'child-persistent-1',
        gameMode: GameMode.Thomthematica,
        totalQuestions: 2,
        totalCorrect: 1,
        status: 'completed',
      })
    );

    // 4. In new Kveshmicera session, a new distinct sessionId is created and state is reset
    const newSessionId = result.current.sessionId;
    expect(newSessionId).not.toBe(initialSessionId);
    expect(result.current.totalQuestions).toBe(0);
    expect(result.current.totalCorrect).toBe(0);

    // 5. Play 1 question in new Kveshmicera session
    act(() => {
      result.current.recordAnswer(true);
    });
    expect(result.current.totalQuestions).toBe(1);
    expect(result.current.totalCorrect).toBe(1);

    // 6. Mode switch to Gethometria with same childId
    act(() => {
      rerender({
        mode: GameMode.Gethometria,
        childId: 'child-persistent-1',
      });
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // 7. Verify Kveshmicera session was flushed as completed
    expect(syncGameSessionSpy).toHaveBeenCalledTimes(2);
    expect(syncGameSessionSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: newSessionId,
        childId: 'child-persistent-1',
        gameMode: GameMode.Kveshmicera,
        totalQuestions: 1,
        totalCorrect: 1,
        status: 'completed',
      })
    );
  });

  it('mode switch pair ThomravlebisTabula <-> Gethometria preserves respective modes and childIds', async () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

    const { result, rerender } = renderHook(
      ({ mode, childId }: { mode: GameMode | null; childId: string | null }) =>
        useGameSession(mode, childId),
      {
        initialProps: {
          mode: GameMode.ThomravlebisTabula,
          childId: 'child-table-1',
        },
      }
    );

    const tableSessionId = result.current.sessionId;

    act(() => {
      result.current.recordAnswer(true);
    });

    // Switch to Gethometria
    act(() => {
      rerender({
        mode: GameMode.Gethometria,
        childId: 'child-table-1',
      });
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(syncGameSessionSpy).toHaveBeenCalledTimes(1);
    expect(syncGameSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: tableSessionId,
        childId: 'child-table-1',
        gameMode: GameMode.ThomravlebisTabula,
        totalQuestions: 1,
        totalCorrect: 1,
        status: 'completed',
      })
    );

    // Reset verified on Gethometria
    expect(result.current.totalQuestions).toBe(0);
    expect(result.current.sessionId).not.toBe(tableSessionId);
  });
});

