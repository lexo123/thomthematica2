import { useReducer, useCallback, useEffect, useRef } from 'react';
import { GameMode } from '../types';
import { sendGameStats, sendWish } from '../services/statsService';

/**
 * Time (in ms) to delay showing the Wish Modal upon completing 40 questions.
 * Gives the user time to see the answer feedback animation before the modal appears.
 */
export const WISH_MODAL_DELAY_MS = 1500;

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

export const useGameSession = (gameMode: GameMode | null) => {
  const [state, dispatch] = useReducer(gameSessionReducer, INITIAL_GAME_SESSION_STATE);

  const latestStatsRef = useRef({
    gameMode,
    totalQuestions: state.totalQuestions,
    totalCorrect: state.totalCorrect,
    sent: false
  });

  useEffect(() => {
    latestStatsRef.current = {
      gameMode,
      totalQuestions: state.totalQuestions,
      totalCorrect: state.totalCorrect,
      sent: false
    };
  }, [gameMode, state.totalQuestions, state.totalCorrect]);

  const flushStats = useCallback(() => {
    const { gameMode: mode, totalQuestions, totalCorrect, sent } = latestStatsRef.current;
    if (mode && totalQuestions > 0 && !sent) {
      latestStatsRef.current.sent = true;
      sendGameStats(mode, totalQuestions, totalCorrect);
    }
  }, []);

  // Sync game stats on unmount or mode switch
  useEffect(() => {
    return () => {
      flushStats();
    };
  }, [gameMode, flushStats]);

  // Sync game stats when user closes tab/window
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushStats();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushStats]);

  const recordAnswer = useCallback((isCorrect: boolean): { isBlock40Completed: boolean } => {
    const currentRecent = state.recentAnswers || [];
    const updatedRecent = [...currentRecent, isCorrect].slice(-40);
    const isWishQualified = updatedRecent.length === 40 && updatedRecent.filter(Boolean).length >= 39;

    dispatch({ type: 'RECORD_ANSWER', isCorrect });

    // Show wish modal ONLY if 39 or 40 questions were correct in the completed 40-question rolling window
    if (isWishQualified) {
      setTimeout(() => {
        dispatch({ type: 'SET_SHOW_WISH_MODAL', show: true });
      }, WISH_MODAL_DELAY_MS);
    }

    return { isBlock40Completed: isWishQualified };
  }, [state.recentAnswers]);

  const handleWishSubmit = useCallback(async (): Promise<boolean> => {
    if (!state.wishText.trim()) return false;

    dispatch({ type: 'SUBMIT_WISH_START' });
    const success = await sendWish(state.wishText, state.lastCompletedBlockCorrectCount);

    if (success) {
      dispatch({ type: 'SUBMIT_WISH_SUCCESS' });
      return true;
    } else {
      dispatch({ type: 'SUBMIT_WISH_ERROR', error: 'სურვილის გაგზავნა ვერ მოხერხდა' });
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
    flushStats();
    dispatch({ type: 'RESET_SESSION' });
  }, [flushStats]);

  return {
    ...state,
    recordAnswer,
    handleWishSubmit,
    closeWishModal,
    setWishText,
    clearFeedback,
    resetSession,
  };
};
