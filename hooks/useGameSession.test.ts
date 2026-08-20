import { describe, it, expect } from 'vitest';
import {
  gameSessionReducer,
  INITIAL_GAME_SESSION_STATE,
  GameSessionState
} from './useGameSession';

describe('gameSessionReducer', () => {
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

  it('should trigger wish on any consecutive 40-question window (e.g. mistakes on Q14 & Q15, then 40 questions with 39-40 correct)', () => {
    let state: GameSessionState = INITIAL_GAME_SESSION_STATE;

    // Q1..Q13: correct (13)
    for (let i = 0; i < 13; i++) {
      state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: true });
    }
    // Q14, Q15: incorrect (2)
    state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: false });
    state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: false });

    expect(state.totalQuestions).toBe(15);
    expect(state.totalCorrect).toBe(13);

    // Q16..Q54: 39 correct answers in a row
    for (let i = 0; i < 39; i++) {
      state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: true });
    }
    // At Q54, the last 40 questions (Q15..Q54) contains 1 incorrect (Q15) and 39 correct!
    expect(state.totalQuestions).toBe(54);
    expect(state.lastCompletedBlockCorrectCount).toBe(39);
    expect(state.recentAnswers.length).toBe(0); // reset upon achieving wish
  });

  it('should trigger wish at Q55 if Q16 was incorrect and Q17..Q55 are 39 correct', () => {
    let state: GameSessionState = INITIAL_GAME_SESSION_STATE;

    // Q1..Q13: correct
    for (let i = 0; i < 13; i++) {
      state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: true });
    }
    // Q14, Q15, Q16: incorrect
    state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: false });
    state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: false });
    state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: false });

    // Q17..Q55: 39 correct answers (39 questions)
    for (let i = 0; i < 39; i++) {
      state = gameSessionReducer(state, { type: 'RECORD_ANSWER', isCorrect: true });
    }

    // At Q55, the last 40 questions (Q16..Q55) contains 1 incorrect (Q16) and 39 correct!
    expect(state.totalQuestions).toBe(55);
    expect(state.lastCompletedBlockCorrectCount).toBe(39);
    expect(state.recentAnswers.length).toBe(0);
  });

  it('should handle wish submission lifecycle correctly', () => {
    let state: GameSessionState = {
      ...INITIAL_GAME_SESSION_STATE,
      wishText: 'I want a dragon picture',
      showWishModal: true
    };

    // Start submission
    state = gameSessionReducer(state, { type: 'SUBMIT_WISH_START' });
    expect(state.wishSubmitting).toBe(true);
    expect(state.wishError).toBeNull();

    // Error case
    let errorState = gameSessionReducer(state, { type: 'SUBMIT_WISH_ERROR', error: 'Network error' });
    expect(errorState.wishSubmitting).toBe(false);
    expect(errorState.wishError).toBe('Network error');

    // Success case
    let successState = gameSessionReducer(state, { type: 'SUBMIT_WISH_SUCCESS' });
    expect(successState.wishSubmitting).toBe(false);
    expect(successState.wishSubmitted).toBe(true);
    expect(successState.showWishModal).toBe(false);
    expect(successState.wishText).toBe('');
  });
});
