import { useReducer, useCallback, useEffect, useRef } from 'react';
import { GameMode } from '../types';
import { syncGameSessionToSupabase, syncWishToSupabase } from '../services/supabaseSyncService';

/**
 * Time (in ms) to delay showing the Wish Modal upon completing 40 questions.
 * Gives the user time to see the answer feedback animation before the modal appears.
 */
export const WISH_MODAL_DELAY_MS = 1500;

export const generateSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
};

export interface GameSessionState {
  totalQuestions: number;
  totalCorrect: number;
  streakCount: number;
  recentAnswers: boolean[];
  questionsInBlock40: number;
  correctInBlock40: number;
  lastCompletedBlockCorrectCount: number;
  perfectBlocksCount: number;
  showWishModal: boolean;
  wishText: string;
  wishSubmitted: boolean;
  wishSubmitting: boolean;
  wishError: string | null;
  feedback: 'correct' | 'incorrect' | null;
}

type GameSessionAction =
  | { type: 'RECORD_ANSWER'; isCorrect: boolean }
  | { type: 'CLEAR_FEEDBACK' }
  | { type: 'SET_SHOW_WISH_MODAL'; show: boolean }
  | { type: 'SET_WISH_TEXT'; text: string }
  | { type: 'SUBMIT_WISH_START' }
  | { type: 'SUBMIT_WISH_SUCCESS' }
  | { type: 'SUBMIT_WISH_ERROR'; error: string }
  | { type: 'RESET_SESSION' };

export const INITIAL_GAME_SESSION_STATE: GameSessionState = {
  totalQuestions: 0,
  totalCorrect: 0,
  streakCount: 0,
  recentAnswers: [],
  questionsInBlock40: 0,
  correctInBlock40: 0,
  lastCompletedBlockCorrectCount: 0,
  perfectBlocksCount: 0,
  showWishModal: false,
  wishText: '',
  wishSubmitted: false,
  wishSubmitting: false,
  wishError: null,
  feedback: null,
};

export function gameSessionReducer(state: GameSessionState, action: GameSessionAction): GameSessionState {
  switch (action.type) {
    case 'RECORD_ANSWER': {
      const isCorrect = action.isCorrect;
      const newTotalQuestions = state.totalQuestions + 1;
      const newTotalCorrect = state.totalCorrect + (isCorrect ? 1 : 0);
      const newStreakCount = isCorrect ? state.streakCount + 1 : 0;
      
      const currentRecent = state.recentAnswers || [];
      const updatedRecentAnswers = [...currentRecent, isCorrect].slice(-40);
      const windowSize = updatedRecentAnswers.length;
      const correctInWindow = updatedRecentAnswers.filter(Boolean).length;

      const isWishQualified = windowSize === 40 && correctInWindow >= 39;

      let nextRecentAnswers = updatedRecentAnswers;
      let lastCompletedBlockCorrectCount = state.lastCompletedBlockCorrectCount;
      let perfectBlocksCount = state.perfectBlocksCount;

      if (isWishQualified) {
        lastCompletedBlockCorrectCount = correctInWindow;
        if (correctInWindow === 40) {
          perfectBlocksCount += 1;
        }
        // Reset sliding window after achieving a qualified 40-question block
        nextRecentAnswers = [];
      }

      return {
        ...state,
        totalQuestions: newTotalQuestions,
        totalCorrect: newTotalCorrect,
        streakCount: newStreakCount,
        recentAnswers: nextRecentAnswers,
        questionsInBlock40: nextRecentAnswers.length,
        correctInBlock40: nextRecentAnswers.filter(Boolean).length,
        lastCompletedBlockCorrectCount,
        perfectBlocksCount,
        feedback: isCorrect ? 'correct' : 'incorrect',
      };
    }

    case 'CLEAR_FEEDBACK':
      return { ...state, feedback: null };

    case 'SET_SHOW_WISH_MODAL':
      return { ...state, showWishModal: action.show };

    case 'SET_WISH_TEXT':
      return { ...state, wishText: action.text };

    case 'SUBMIT_WISH_START':
      return { ...state, wishSubmitting: true, wishError: null };

    case 'SUBMIT_WISH_SUCCESS':
      return { ...state, wishSubmitting: false, wishSubmitted: true, wishText: '', showWishModal: false };

    case 'SUBMIT_WISH_ERROR':
      return { ...state, wishSubmitting: false, wishError: action.error };

    case 'RESET_SESSION':
      return INITIAL_GAME_SESSION_STATE;

    default:
      return state;
  }
}

export const useGameSession = (gameMode: GameMode | null, childId?: string | null) => {
  const [state, dispatch] = useReducer(gameSessionReducer, INITIAL_GAME_SESSION_STATE);

  // Session ID lifecycle
  const sessionIdRef = useRef<string>(generateSessionId());
  const sessionStartedAtRef = useRef<string>(new Date().toISOString());
  const sessionStartTimeMsRef = useRef<number>(Date.now());
  const sessionChildIdRef = useRef<string | null>(childId || null);
  const isCompletedRef = useRef<boolean>(false);

  // Active play duration tracking (accumulated active ms + last resume timestamp)
  const accumulatedActiveMsRef = useRef<number>(0);
  const lastActiveResumeMsRef = useRef<number>(Date.now());
  const isTabVisibleRef = useRef<boolean>(
    typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true
  );

  const getActiveDurationSeconds = useCallback((): number => {
    let totalActiveMs = accumulatedActiveMsRef.current;
    if (isTabVisibleRef.current) {
      totalActiveMs += Date.now() - lastActiveResumeMsRef.current;
    }
    return Math.max(0, Math.floor(totalActiveMs / 1000));
  }, []);

  const resetActiveTimer = useCallback(() => {
    accumulatedActiveMsRef.current = 0;
    lastActiveResumeMsRef.current = Date.now();
    isTabVisibleRef.current =
      typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true;
    sessionStartedAtRef.current = new Date().toISOString();
    sessionStartTimeMsRef.current = Date.now();
    totalQuestionsRef.current = 0;
    totalCorrectRef.current = 0;
    perfectBlocksCountRef.current = 0;
  }, []);

  // Sequential Sync Queue to guarantee FIFO execution of Supabase session updates
  const syncQueueRef = useRef<Promise<any>>(Promise.resolve());

  const enqueueSync = useCallback((syncFn: () => Promise<any>) => {
    syncQueueRef.current = syncQueueRef.current
      .then(() => syncFn())
      .catch(err => {
        console.warn('Sync failed in sequential queue:', err);
      });
    return syncQueueRef.current;
  }, []);

  // Accurate running counts in refs to avoid React closure lag
  const totalQuestionsRef = useRef<number>(0);
  const totalCorrectRef = useRef<number>(0);
  const perfectBlocksCountRef = useRef<number>(0);

  // Latest mutable ref to state for flushing on unmount / navigation
  const latestRef = useRef({
    gameMode,
    childId: sessionChildIdRef.current,
    sessionId: sessionIdRef.current,
    totalQuestions: 0,
    totalCorrect: 0,
    perfectBlocksCount: 0,
  });

  useEffect(() => {
    totalQuestionsRef.current = state.totalQuestions;
    totalCorrectRef.current = state.totalCorrect;
    perfectBlocksCountRef.current = state.perfectBlocksCount;

    latestRef.current = {
      gameMode,
      childId: sessionChildIdRef.current,
      sessionId: sessionIdRef.current,
      totalQuestions: state.totalQuestions,
      totalCorrect: state.totalCorrect,
      perfectBlocksCount: state.perfectBlocksCount,
    };
  }, [gameMode, state.totalQuestions, state.totalCorrect, state.perfectBlocksCount]);

  // Synchronous or asynchronous flush of the current session on completion
  const flushCompletedSession = useCallback((override?: { mode?: GameMode | null; childId?: string | null }) => {
    const mode = override?.mode !== undefined ? override.mode : latestRef.current.gameMode;
    const currentChildId = override?.childId !== undefined ? override.childId : latestRef.current.childId;
    const { sessionId, totalQuestions, totalCorrect, perfectBlocksCount } = latestRef.current;
    
    if (!mode || totalQuestions <= 0 || isCompletedRef.current) {
      return;
    }

    isCompletedRef.current = true;
    const durationSeconds = getActiveDurationSeconds();

    if (currentChildId) {
      // Authenticated child -> Supabase sync via sequential queue
      enqueueSync(() =>
        syncGameSessionToSupabase({
          id: sessionId,
          childId: currentChildId,
          gameMode: mode,
          totalQuestions,
          totalCorrect,
          perfectBlocksCount,
          durationSeconds,
          status: 'completed',
          startedAt: sessionStartedAtRef.current,
          endedAt: new Date().toISOString(),
        })
      );
    }
  }, [enqueueSync, getActiveDurationSeconds]);

  // Atomic combined transition effect for gameMode and childId
  const prevGameModeRef = useRef<GameMode | null>(gameMode);
  const prevChildIdRef = useRef<string | null | undefined>(childId);

  useEffect(() => {
    const prevMode = prevGameModeRef.current;
    const nextMode = gameMode;
    prevGameModeRef.current = nextMode;

    const prevChild = prevChildIdRef.current || null;
    const nextChild = childId || null;
    prevChildIdRef.current = childId;

    const modeChanged = prevMode !== nextMode;
    const childChanged = prevChild !== nextChild;

    if (modeChanged) {
      // 1. Mode changed (with or without childId change)
      // Flush previous mode session with its original mode and childId
      flushCompletedSession({ mode: prevMode, childId: prevChild });

      // Reset everything for the new game mode & child
      sessionIdRef.current = generateSessionId();
      sessionChildIdRef.current = nextChild;
      isCompletedRef.current = false;
      resetActiveTimer();
      dispatch({ type: 'RESET_SESSION' });
    } else if (childChanged) {
      // 2. Mode stayed the same, but childId changed
      if (prevChild !== null) {
        // Switching from one child to another (or logout)
        flushCompletedSession({ mode: prevMode, childId: prevChild });

        // Start new session for the new child
        sessionIdRef.current = generateSessionId();
        sessionChildIdRef.current = nextChild;
        isCompletedRef.current = false;
        resetActiveTimer();
        dispatch({ type: 'RESET_SESSION' });
      } else if (nextChild !== null) {
        // Previous was null, new child adopted
        if (totalQuestionsRef.current === 0) {
          sessionChildIdRef.current = nextChild;
        } else {
          sessionIdRef.current = generateSessionId();
          sessionChildIdRef.current = nextChild;
          isCompletedRef.current = false;
          resetActiveTimer();
          dispatch({ type: 'RESET_SESSION' });
        }
      }
    }

    return () => {
      flushCompletedSession({ mode: nextMode, childId: nextChild });
    };
  }, [gameMode, childId, flushCompletedSession, resetActiveTimer]);

  // Page Visibility API event listener to accurately pause/resume active play timer
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        if (isTabVisibleRef.current) {
          accumulatedActiveMsRef.current += Date.now() - lastActiveResumeMsRef.current;
          isTabVisibleRef.current = false;
        }
      } else {
        if (!isTabVisibleRef.current) {
          lastActiveResumeMsRef.current = Date.now();
          isTabVisibleRef.current = true;
        }
      }
    };

    document.addEventListener('addEventListener' in document ? 'visibilitychange' : 'visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Sync game stats when user closes tab/window
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushCompletedSession();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushCompletedSession]);

  const recordAnswer = useCallback((isCorrect: boolean): { isBlock40Completed: boolean } => {
    const currentRecent = state.recentAnswers || [];
    const updatedRecent = [...currentRecent, isCorrect].slice(-40);
    const isWishQualified = updatedRecent.length === 40 && updatedRecent.filter(Boolean).length >= 39;

    totalQuestionsRef.current += 1;
    if (isCorrect) {
      totalCorrectRef.current += 1;
    }
    if (isWishQualified && updatedRecent.filter(Boolean).length === 40) {
      perfectBlocksCountRef.current += 1;
    }

    const currentTotalQuestions = totalQuestionsRef.current;
    const currentTotalCorrect = totalCorrectRef.current;
    const currentPerfectBlocksCount = perfectBlocksCountRef.current;

    // Update latestRef synchronously so any immediately following flush has exact numbers
    latestRef.current = {
      gameMode,
      childId: sessionChildIdRef.current,
      sessionId: sessionIdRef.current,
      totalQuestions: currentTotalQuestions,
      totalCorrect: currentTotalCorrect,
      perfectBlocksCount: currentPerfectBlocksCount,
    };

    dispatch({ type: 'RECORD_ANSWER', isCorrect });

    // Auto-save every 10 questions for authenticated sessions (status: 'active')
    if (sessionChildIdRef.current && gameMode && currentTotalQuestions > 0 && currentTotalQuestions % 10 === 0) {
      const durationSeconds = getActiveDurationSeconds();
      enqueueSync(() =>
        syncGameSessionToSupabase({
          id: sessionIdRef.current,
          childId: sessionChildIdRef.current!,
          gameMode,
          totalQuestions: currentTotalQuestions,
          totalCorrect: currentTotalCorrect,
          perfectBlocksCount: currentPerfectBlocksCount,
          durationSeconds,
          status: 'active',
          startedAt: sessionStartedAtRef.current,
        })
      );
    }

    // Show wish modal ONLY if 39 or 40 questions were correct in the completed 40-question rolling window
    if (isWishQualified) {
      setTimeout(() => {
        dispatch({ type: 'SET_SHOW_WISH_MODAL', show: true });
      }, WISH_MODAL_DELAY_MS);
    }

    return { isBlock40Completed: isWishQualified };
  }, [state.recentAnswers, gameMode, enqueueSync, getActiveDurationSeconds]);

  const handleWishSubmit = useCallback(async (): Promise<boolean> => {
    const trimmedWish = state.wishText.trim();
    if (!trimmedWish) return false;

    dispatch({ type: 'SUBMIT_WISH_START' });

    try {
      if (sessionChildIdRef.current) {
        // Authenticated child -> Supabase wish sync
        const result = await syncWishToSupabase({
          childId: sessionChildIdRef.current,
          wishText: trimmedWish,
          correctCount: state.lastCompletedBlockCorrectCount,
        });

        if (result.success) {
          dispatch({ type: 'SUBMIT_WISH_SUCCESS' });
          return true;
        } else {
          dispatch({ type: 'SUBMIT_WISH_ERROR', error: result.error || 'სურვილის გაგზავნა ვერ მოხერხდა' });
          return false;
        }
      } else {
        dispatch({ type: 'SUBMIT_WISH_ERROR', error: 'სურვილის გასაგზავნად აირჩიეთ ბავშვის პროფილი' });
        return false;
      }
    } catch (err: any) {
      dispatch({ type: 'SUBMIT_WISH_ERROR', error: err?.message || 'სურვილის გაგზავნა ვერ მოხერხდა' });
      return false;
    }
  }, [state.wishText, state.lastCompletedBlockCorrectCount]);

  const closeWishModal = useCallback(() => {
    dispatch({ type: 'SET_SHOW_WISH_MODAL', show: false });
  }, []);

  const setWishText = useCallback((text: string) => {
    dispatch({ type: 'SET_WISH_TEXT', text });
  }, []);

  const clearFeedback = useCallback(() => {
    dispatch({ type: 'CLEAR_FEEDBACK' });
  }, []);

  const resetSession = useCallback(() => {
    // 1. Flush previous session
    flushCompletedSession();

    // 2. Generate a new session ID and reset session start time
    sessionIdRef.current = generateSessionId();
    sessionChildIdRef.current = childId || null;
    isCompletedRef.current = false;
    resetActiveTimer();

    // 3. Reset state
    dispatch({ type: 'RESET_SESSION' });
  }, [flushCompletedSession, childId, resetActiveTimer]);

  return {
    ...state,
    sessionId: sessionIdRef.current,
    recordAnswer,
    handleWishSubmit,
    closeWishModal,
    setWishText,
    clearFeedback,
    resetSession,
  };
};
