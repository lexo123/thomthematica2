// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import App from '../App';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as problemGenerator from '../services/problemGenerator';
import { GameMode, Operation, MathProblem } from '../types';
import { getExpectedDigits } from '../utils/columnMultiplication';
import { saveGameProgress, clearGameProgress } from '../services/gameProgressStorage';

describe('Phase 3 - Kveshmicera Retry & Question-level Recording Flow', () => {
  const childId = 'child-kvesh-test-1';

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    clearGameProgress(childId, GameMode.Kveshmicera);

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-123', email: 'parent@example.com' } as any,
      session: { user: { id: 'parent-123' } } as any,
      loading: false,
      loginWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
    });

    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [{ id: childId, parent_id: 'parent-123', name: 'თომა', avatar_url: null, created_at: '' }],
      activeChild: { id: childId, parent_id: 'parent-123', name: 'თომა', avatar_url: null, created_at: '' },
      activeChildId: childId,
      loading: false,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  const setupDeterministicProblems = (problems: MathProblem[]) => {
    let callCount = 0;
    vi.spyOn(problemGenerator, 'generateProblem').mockImplementation((mode: GameMode) => {
      if (mode === GameMode.Kveshmicera) {
        const prob = problems[callCount % problems.length];
        callCount++;
        return prob;
      }
      return {
        category: 'math',
        operation: Operation.Multiply,
        num1: 2,
        num2: 3,
        answer: 6,
      };
    });
  };

  const fillKveshDigits = (num1: number, num2: number, makeIncorrect: boolean = false) => {
    const expected = getExpectedDigits(num1, num2);
    (['r1', 'r2', 'res'] as const).forEach((row) => {
      for (let col = 0; col < 4; col++) {
        const input = document.getElementById(`cell-${row}-${col}`) as HTMLInputElement;
        if (input) {
          let val = expected[row][col];
          if (makeIncorrect && row === 'res' && col === 3) {
            val = val === '9' ? '8' : '9'; // intentionally wrong digit
          }
          fireEvent.change(input, { target: { value: val } });
        }
      }
    });
  };

  const submitKvesh = () => {
    const checkBtn = screen.getByRole('button', { name: /შემოწმება/ });
    fireEvent.click(checkBtn);
  };

  it('B. Incorrect answer stays inline on same question without generic Incorrect overlay, showing validation and keeping entered digits', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 24,
      num2: 12,
      operation: Operation.Multiply,
      answer: 288,
    };
    setupDeterministicProblems([q1]);

    render(<App />);

    // Select Kveshmicera mode
    fireEvent.click(screen.getByText('ქვეშმიწერით გამრავლება ✍️'));

    // Verify initial state: score 0/0
    expect(screen.getByText('0/0')).toBeDefined();

    // Fill incorrect answer
    fillKveshDigits(24, 12, true);

    // Verify cell has the entered digit before submit
    const resCell = document.getElementById('cell-res-3') as HTMLInputElement;
    const enteredWrongVal = resCell.value;
    expect(enteredWrongVal).not.toBe('');

    // Submit wrong answer
    submitKvesh();

    // 1. Kveshmicera answer is incorrect, and score recorded once: 0/1 (0 correct out of 1 question)
    expect(screen.getByText('0/1')).toBeDefined();

    // 2. The game remains on the SAME question: inputs for current problem are still rendered
    expect(document.getElementById('cell-res-3')).not.toBeNull();
    expect(screen.getByText('შეავსე ქვეშმიწერით გამრავლება!')).toBeDefined();

    // 3. Generic GameState.Incorrect behavior is NOT entered (no generic ResultOverlay "თავიდან სცადე" button)
    expect(screen.queryByRole('button', { name: /თავიდან სცადე/ })).toBeNull();

    // 4. Inline validation remains active
    expect(screen.getByText(/ზოგიერთი ციფრი არასწორია! შეასწორე წითელი უჯრები/i)).toBeDefined();

    // 5. The entered digits are NOT cleared merely because the answer was incorrect
    expect(resCell.value).toBe(enteredWrongVal);
  });

  it('C. Repeated wrong attempts on the same question record recordAnswer(false) exactly once', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 24,
      num2: 12,
      operation: Operation.Multiply,
      answer: 288,
    };
    setupDeterministicProblems([q1]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გამრავლება ✍️'));

    // Attempt 1: wrong
    fillKveshDigits(24, 12, true);
    submitKvesh();
    expect(screen.getByText('0/1')).toBeDefined();

    // Attempt 2: wrong again
    submitKvesh();
    // Still 0/1! NOT 0/2
    expect(screen.getByText('0/1')).toBeDefined();

    // Attempt 3: wrong again with different digit
    const resCell = document.getElementById('cell-res-2') as HTMLInputElement;
    fireEvent.change(resCell, { target: { value: '7' } });
    submitKvesh();
    // Still 0/1! Exactly ONE recorded answer for repeated wrong attempts
    expect(screen.getByText('0/1')).toBeDefined();
  });

  it('D. Wrong → wrong → correct records exactly one false, zero additional true for same question, then transitions to next question', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 24,
      num2: 12,
      operation: Operation.Multiply,
      answer: 288,
    };
    const q2: MathProblem = {
      category: 'math',
      num1: 31,
      num2: 14,
      operation: Operation.Multiply,
      answer: 434,
    };
    setupDeterministicProblems([q1, q2]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გამრავლება ✍️'));

    // Attempt 1: wrong
    fillKveshDigits(24, 12, true);
    submitKvesh();
    expect(screen.getByText('0/1')).toBeDefined();

    // Attempt 2: wrong
    submitKvesh();
    expect(screen.getByText('0/1')).toBeDefined();

    // Attempt 3: correct answer for Q1
    fillKveshDigits(24, 12, false);
    submitKvesh();

    // 🔑 Critical: zero additional answers recorded for the same question!
    // Total questions remains 1, total correct remains 0!
    expect(screen.getByText('0/1')).toBeDefined();

    // Correct overlay is shown
    const nextBtn = screen.getByRole('button', { name: /შემდეგი/ });
    expect(nextBtn).toBeDefined();

    // Click "შემდეგი" to advance
    fireEvent.click(nextBtn);

    // Q2 is loaded
    expect(document.getElementById('cell-res-3')).not.toBeNull();
    // Inline validation is cleared
    expect(screen.queryByText(/ზოგიერთი ციფრი არასწორია/i)).toBeNull();
  });

  it('E. Next question is independent: Q1 (wrong → wrong → correct) then Q2 (correct) records [false, true]', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 24,
      num2: 12,
      operation: Operation.Multiply,
      answer: 288,
    };
    const q2: MathProblem = {
      category: 'math',
      num1: 31,
      num2: 14,
      operation: Operation.Multiply,
      answer: 434,
    };
    setupDeterministicProblems([q1, q2]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გამრავლება ✍️'));

    // Q1: wrong → wrong → correct
    fillKveshDigits(24, 12, true);
    submitKvesh(); // recorded: false
    expect(screen.getByText('0/1')).toBeDefined();

    submitKvesh(); // duplicate wrong: not recorded
    expect(screen.getByText('0/1')).toBeDefined();

    fillKveshDigits(24, 12, false);
    submitKvesh(); // correct retry: not recorded
    expect(screen.getByText('0/1')).toBeDefined();

    // Advance to Q2
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Q2: correct
    fillKveshDigits(31, 14, false);
    submitKvesh();

    // Q2 recorded its result normally!
    // Total questions: 2, Total correct: 1 (i.e. [false, true])
    expect(screen.getByText('1/2')).toBeDefined();
  });

  it('F. 20-question Kveshmicera block boundary: 18 correct, Q19 (wrong → wrong → correct), Q20 (correct) reaches qualification boundary', async () => {
    // Pre-populate 18 correct questions in localStorage for Kveshmicera
    saveGameProgress(childId, GameMode.Kveshmicera, Array(18).fill(true));

    const q19: MathProblem = {
      category: 'math',
      num1: 24,
      num2: 12,
      operation: Operation.Multiply,
      answer: 288,
    };
    const q20: MathProblem = {
      category: 'math',
      num1: 31,
      num2: 14,
      operation: Operation.Multiply,
      answer: 434,
    };
    setupDeterministicProblems([q19, q20]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გამრავლება ✍️'));

    // Initial session score is 0/0, with 18 answers in restored window
    expect(screen.getByText('0/0')).toBeDefined();

    // Q19: attempt 1 (wrong) -> records 1 false (now session score is 0/1)
    fillKveshDigits(24, 12, true);
    submitKvesh();
    expect(screen.getByText('0/1')).toBeDefined();

    // Q19: attempt 2 (wrong) -> does NOT record another false (still 0/1)
    submitKvesh();
    expect(screen.getByText('0/1')).toBeDefined();

    // Q19: attempt 3 (correct retry) -> does NOT record another answer (still 0/1)
    fillKveshDigits(24, 12, false);
    submitKvesh();
    expect(screen.getByText('0/1')).toBeDefined();

    // Advance to Q20
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Q20: correct answer -> records 1 true (session score is 1/2)
    fillKveshDigits(31, 14, false);
    submitKvesh();
    expect(screen.getByText('1/2')).toBeDefined();

    // Exactly 20 questions recorded in rolling window: 18 restored + Q19 (1 false) + Q20 (1 true)
    // Total correct in 20-block: 19/20
    // WishModal opens after WISH_MODAL_DELAY_MS because 19/20 qualifies for Kveshmicera (20-block threshold is 19)
    await waitFor(() => {
      expect(screen.getByText(/ზედიზედ 20 კითხვიდან 19 სწორად გამოიცანი/i)).toBeDefined();
      expect(screen.getByText('ბრავო თომა!')).toBeDefined();
    }, { timeout: 3000 });
  });
});
