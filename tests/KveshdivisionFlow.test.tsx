// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import App from '../App';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as SessionModeContext from '../contexts/SessionModeContext';
import * as problemGenerator from '../services/problemGenerator';
import { GameMode, Operation, MathProblem } from '../types';
import { buildDivisionLayout } from '../utils/columnDivision';
import { saveGameProgress, clearGameProgress } from '../services/gameProgressStorage';

const focusFirstCellSpy = vi.fn();

vi.mock('../hooks/useColumnDivision', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useColumnDivision')>();
  return {
    ...actual,
    useColumnDivision: (layout: any) => {
      const hookResult = actual.useColumnDivision(layout);
      const originalFocus = hookResult.focusFirstCell;
      return {
        ...hookResult,
        focusFirstCell: (l: any) => {
          focusFirstCellSpy(l);
          return originalFocus(l);
        },
      };
    },
  };
});

describe('Commit 3 - Kveshdivision Flow & App-level Integration Tests', () => {
  const childId = 'child-division-test-1';

  beforeEach(() => {
    vi.restoreAllMocks();
    focusFirstCellSpy.mockClear();
    localStorage.clear();
    clearGameProgress(childId, GameMode.Kveshdivision);
    clearGameProgress(childId, GameMode.Kveshmicera);

    vi.spyOn(SessionModeContext, 'useSessionMode').mockReturnValue({
      sessionMode: 'child',
      setSessionMode: vi.fn(),
      resetSessionMode: vi.fn(),
    });

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-123', email: 'parent@example.com' } as any,
      session: { user: { id: 'parent-123' } } as any,
      loading: false,
      loginWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
    });

    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: childId, parent_id: 'parent-123', name: 'თომა', avatar_url: null, avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      ],
      activeChild: { id: childId, parent_id: 'parent-123', name: 'თომა', avatar_url: null, avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
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
      if (mode === GameMode.Kveshdivision) {
        const prob = problems[callCount % problems.length];
        callCount++;
        return prob;
      }
      if (mode === GameMode.Kveshmicera) {
        return {
          category: 'math',
          num1: 24,
          num2: 12,
          operation: Operation.Multiply,
          answer: 288,
        };
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

  const fillDivision = (
    num1: number,
    num2: number,
    options: { wrong?: boolean; includeOptional?: boolean } = {}
  ) => {
    const layout = buildDivisionLayout(num1, num2);
    for (const cell of layout.cells) {
      if (cell.kind === 'spare') {
        continue;
      }
      if (options.includeOptional === false && cell.rule === 'optional') {
        continue;
      }
      const input = document.getElementById(`cell-${cell.id}`) as HTMLInputElement;
      if (input) {
        let val = cell.expected;
        if (options.wrong && cell.id === 'q-0') {
          val = val === '9' ? '8' : '9';
        }
        fireEvent.change(input, { target: { value: val } });
      }
    }
  };

  const submitDivision = () => {
    const checkBtn = screen.getByRole('button', { name: /შემოწმება/ });
    fireEvent.click(checkBtn);
  };

  it('B. Incorrect answer stays inline on same question without generic Incorrect overlay, showing validation and keeping entered digits', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    setupDeterministicProblems([q1]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    expect(screen.getByText('0/0')).toBeDefined();

    fillDivision(345, 3, { wrong: true });

    const q0Cell = document.getElementById('cell-q-0') as HTMLInputElement;
    const enteredWrongVal = q0Cell.value;
    expect(enteredWrongVal).not.toBe('');

    submitDivision();

    // 1. Score recorded once: 0/1
    expect(screen.getByText('0/1')).toBeDefined();

    // 2. The game remains on the SAME question
    expect(document.getElementById('cell-q-0')).not.toBeNull();
    expect(screen.getByText('შეავსე ქვეშმიწერით გაყოფა!')).toBeDefined();

    // 3. Generic Incorrect overlay ("თავიდან სცადე") is NOT rendered
    expect(screen.queryByRole('button', { name: /თავიდან სცადე/ })).toBeNull();

    // 4. Inline validation banner is visible
    expect(screen.getByText(/ზოგიერთი ციფრი არასწორია! შეასწორე წითელი უჯრები/i)).toBeDefined();

    // 5. Entered digits are not cleared
    expect(q0Cell.value).toBe(enteredWrongVal);
  });

  it('C. Repeated wrong attempts on the same question record recordAnswer(false) exactly once (0/1)', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    setupDeterministicProblems([q1]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    // Attempt 1: wrong
    fillDivision(345, 3, { wrong: true });
    submitDivision();
    expect(screen.getByText('0/1')).toBeDefined();

    // Attempt 2: wrong again
    submitDivision();
    expect(screen.getByText('0/1')).toBeDefined();

    // Attempt 3: wrong with different digit
    const q0Cell = document.getElementById('cell-q-0') as HTMLInputElement;
    fireEvent.change(q0Cell, { target: { value: '7' } });
    submitDivision();
    expect(screen.getByText('0/1')).toBeDefined();
  });

  it('D. Wrong → wrong → correct records exactly one false, zero additional true for same question, then transitions to next question', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    const q2: MathProblem = {
      category: 'math',
      num1: 4056,
      num2: 4,
      operation: Operation.Divide,
      answer: 1014,
    };
    setupDeterministicProblems([q1, q2]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    // Attempt 1: wrong
    fillDivision(345, 3, { wrong: true });
    submitDivision();
    expect(screen.getByText('0/1')).toBeDefined();

    // Attempt 2: wrong
    submitDivision();
    expect(screen.getByText('0/1')).toBeDefined();

    // Attempt 3: correct answer for Q1
    fillDivision(345, 3, { wrong: false });
    submitDivision();

    // Total questions remains 1, total correct remains 0
    expect(screen.getByText('0/1')).toBeDefined();

    // Correct overlay is shown
    const nextBtn = screen.getByRole('button', { name: /შემდეგი/ });
    expect(nextBtn).toBeDefined();

    // Click "შემდეგი" to advance
    fireEvent.click(nextBtn);

    // Q2 (4056÷4) loaded
    expect(document.getElementById('cell-q-3')).not.toBeNull();
    expect(screen.queryByText(/ზოგიერთი ციფრი არასწორია/i)).toBeNull();
  });

  it('E. Next question is independent: Q1 (wrong → wrong → correct) then Q2 (correct) records [false, true]', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    const q2: MathProblem = {
      category: 'math',
      num1: 4056,
      num2: 4,
      operation: Operation.Divide,
      answer: 1014,
    };
    setupDeterministicProblems([q1, q2]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    // Q1: wrong → wrong → correct
    fillDivision(345, 3, { wrong: true });
    submitDivision();
    expect(screen.getByText('0/1')).toBeDefined();

    submitDivision();
    expect(screen.getByText('0/1')).toBeDefined();

    fillDivision(345, 3, { wrong: false });
    submitDivision();
    expect(screen.getByText('0/1')).toBeDefined();

    // Advance to Q2
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Q2: correct
    fillDivision(4056, 4, { wrong: false });
    submitDivision();

    // Score is 1/2
    expect(screen.getByText('1/2')).toBeDefined();
  });

  it('F. 20-question block boundary: 18 correct pre-saved, Q19 (wrong → wrong → correct), Q20 (correct) reaches qualification boundary', async () => {
    saveGameProgress(childId, GameMode.Kveshdivision, Array(18).fill(true));

    const q19: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    const q20: MathProblem = {
      category: 'math',
      num1: 4056,
      num2: 4,
      operation: Operation.Divide,
      answer: 1014,
    };
    setupDeterministicProblems([q19, q20]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    expect(screen.getByText('0/0')).toBeDefined();

    // Q19: wrong
    fillDivision(345, 3, { wrong: true });
    submitDivision();
    expect(screen.getByText('0/1')).toBeDefined();

    // Q19: retry correct
    fillDivision(345, 3, { wrong: false });
    submitDivision();
    expect(screen.getByText('0/1')).toBeDefined();

    // Advance to Q20
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Q20: correct
    fillDivision(4056, 4, { wrong: false });
    submitDivision();
    expect(screen.getByText('1/2')).toBeDefined();

    // WishModal appears for 19/20 correct in 20-question block
    await waitFor(() => {
      expect(screen.getByText(/ზედიზედ 20 კითხვიდან 19 სწორად გამოიცანი/i)).toBeDefined();
      expect(screen.getByText('ბრავო თომა!')).toBeDefined();
    }, { timeout: 3000 });
  });

  it('G. Repeated submission guard: repeating Enter / submit on Correct overlay does not duplicate recorded correct answers', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    setupDeterministicProblems([q1]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    fillDivision(345, 3, { wrong: false });

    const finalCell = document.getElementById('cell-final') as HTMLInputElement;
    fireEvent.keyDown(finalCell, { key: 'Enter' });

    expect(screen.getByText('1/1')).toBeDefined();
    expect(screen.getByRole('button', { name: /შემდეგი/ })).toBeDefined();

    // Repeat click on checkBtn while overlay is showing
    for (let i = 0; i < 4; i++) {
      const checkBtn = screen.queryByRole('button', { name: /შემოწმება/ });
      if (checkBtn) {
        fireEvent.click(checkBtn);
      }
    }

    expect(screen.getByText('1/1')).toBeDefined();
    expect(screen.queryByText('2/2')).toBeNull();
    expect(screen.queryByText('5/5')).toBeNull();
  });

  it('H. Repeated submission guard does not break inline retry: retry submissions in Playing state proceed normally', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    setupDeterministicProblems([q1]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    fillDivision(345, 3, { wrong: true });
    submitDivision();

    expect(screen.getByText('0/1')).toBeDefined();
    expect(screen.getByText(/ზოგიერთი ციფრი არასწორია/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /შემდეგი/ })).toBeNull();

    // Retry correctly in Playing state
    fillDivision(345, 3, { wrong: false });
    submitDivision();

    expect(screen.getByRole('button', { name: /შემდეგი/ })).toBeDefined();
  });

  it('I. Enter on last cell (final) closes ResultOverlay and advances to next problem when overlay is showing', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    const q2: MathProblem = {
      category: 'math',
      num1: 4056,
      num2: 4,
      operation: Operation.Divide,
      answer: 1014,
    };
    setupDeterministicProblems([q1, q2]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    fillDivision(345, 3, { wrong: false });
    const finalCell = document.getElementById('cell-final') as HTMLInputElement;

    // First Enter submits answer
    fireEvent.keyDown(finalCell, { key: 'Enter' });
    expect(screen.getByRole('button', { name: /შემდეგი/ })).toBeDefined();

    // Second Enter closes overlay and advances
    fireEvent.keyDown(finalCell, { key: 'Enter' });

    expect(screen.queryByRole('button', { name: /შემდეგი/ })).toBeNull();
    // Next question (4056÷4) is displayed
    expect(document.getElementById('cell-q-3')).not.toBeNull();
  });

  it('J. With only required cells filled (includeOptional: false, spare empty), correct answer is accepted (1/1)', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    setupDeterministicProblems([q1]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    // Fill only required cells
    fillDivision(345, 3, { includeOptional: false, wrong: false });
    submitDivision();

    expect(screen.getByText('1/1')).toBeDefined();
    expect(screen.getByRole('button', { name: /შემდეგი/ })).toBeDefined();
  });

  it('K. optional cell with wrong digit -> incorrect; spare cell with any digit -> incorrect', () => {
    const q215: MathProblem = {
      category: 'math',
      num1: 215,
      num2: 5,
      operation: Operation.Divide,
      answer: 43,
    };
    setupDeterministicProblems([q215]);

    const { unmount } = render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    // Part 1: wrong digit in optional cell (e.g. final)
    fillDivision(215, 5, { includeOptional: true, wrong: false });
    const finalInput = document.getElementById('cell-final') as HTMLInputElement;
    fireEvent.change(finalInput, { target: { value: '9' } }); // expected 0 or empty, 9 is wrong
    submitDivision();

    expect(screen.getByText('0/1')).toBeDefined();
    expect(screen.getByText(/ზოგიერთი ციფრი არასწორია/i)).toBeDefined();

    unmount();

    // Part 2: any digit in spare cell 's-0'
    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    fillDivision(215, 5, { includeOptional: false, wrong: false });
    const spareInput = document.getElementById('cell-s-0') as HTMLInputElement;
    expect(spareInput).not.toBeNull();
    fireEvent.change(spareInput, { target: { value: '0' } }); // '0' in spare is an error
    submitDivision();

    expect(screen.getByText('0/1')).toBeDefined();
    expect(screen.getByText(/ზოგიერთი ციფრი არასწორია/i)).toBeDefined();
  });

  it('L. Empty Enter: Enter on final cell when NO cells are filled does NOT count as answer (score remains 0/0)', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    setupDeterministicProblems([q1]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    const finalCell = document.getElementById('cell-final') as HTMLInputElement;
    expect(finalCell).not.toBeNull();

    // Press Enter on final cell while completely empty
    fireEvent.keyDown(finalCell, { key: 'Enter' });

    // Score remains 0/0, nothing recorded
    expect(screen.getByText('0/0')).toBeDefined();
    expect(screen.queryByText('0/1')).toBeNull();
    expect(screen.queryByText(/ზოგიერთი ციფრი არასწორია/i)).toBeNull();
  });

  it('M. State leak reset: after wrong attempt, clicking Home and re-opening division resets banner and clears all cells', () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    setupDeterministicProblems([q1]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    fillDivision(345, 3, { wrong: true });
    submitDivision();

    expect(screen.getByText(/ზოგიერთი ციფრი არასწორია/i)).toBeDefined();
    const q0Cell = document.getElementById('cell-q-0') as HTMLInputElement;
    expect(q0Cell.value).not.toBe('');

    // Click Home 🏠
    const homeBtn = screen.getByTitle('მთავარი მენიუ');
    fireEvent.click(homeBtn);

    // Re-select division
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    // Validation banner NOT shown
    expect(screen.queryByText(/ზოგიერთი ციფრი არასწორია/i)).toBeNull();

    // All cells empty
    const cells = document.querySelectorAll<HTMLInputElement>('input[id^="cell-"]');
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach((cell) => {
      expect(cell.value).toBe('');
    });
  });

  it('N. Stale problem protection: generateProblem returning non-division problem renders "იტვირთება..." without crashing and zero console errors', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    const consoleWarnSpy = vi.spyOn(console, 'warn');

    setupDeterministicProblems([
      {
        category: 'math',
        num1: 24,
        num2: 12,
        operation: Operation.Multiply,
        answer: 288,
      },
    ]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    expect(screen.getByText('იტვირთება...')).toBeDefined();
    expect(document.querySelector('[id^="cell-"]')).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('O. Mode switching: Division → Home → Kveshmicera → Home → Division maintains clean states', () => {
    const qDiv: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    const qMult: MathProblem = {
      category: 'math',
      num1: 24,
      num2: 12,
      operation: Operation.Multiply,
      answer: 288,
    };
    setupDeterministicProblems([qDiv]);

    render(<App />);

    // 1. Enter Division
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));
    expect(screen.getByText('შეავსე ქვეშმიწერით გაყოფა!')).toBeDefined();

    // Home
    fireEvent.click(screen.getByTitle('მთავარი მენიუ'));

    // 2. Enter Kveshmicera
    fireEvent.click(screen.getByText('ქვეშმიწერით გამრავლება ✍️'));
    expect(screen.getByText('შეავსე ქვეშმიწერით გამრავლება!')).toBeDefined();
    expect(document.getElementById('cell-r1-0')).not.toBeNull();

    // Home
    fireEvent.click(screen.getByTitle('მთავარი მენიუ'));

    // 3. Return to Division
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));
    expect(screen.getByText('შეავსე ქვეშმიწერით გაყოფა!')).toBeDefined();
    expect(screen.queryByText(/ზოგიერთი ციფრი არასწორია/i)).toBeNull();
  });

  it('P. Single answer UI: division renders cell-* inputs and NO quiz-answer-input; Kveshmicera has no quiz-answer-input; standard mode has quiz-answer-input', () => {
    const qDiv: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    setupDeterministicProblems([qDiv]);

    const { unmount } = render(<App />);

    // Division mode
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));
    expect(document.getElementById('cell-q-0')).not.toBeNull();
    expect(screen.queryByTestId('quiz-answer-input')).toBeNull();

    unmount();

    // Kveshmicera mode
    const { unmount: unmountKvesh } = render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გამრავლება ✍️'));
    expect(document.getElementById('cell-r1-0')).not.toBeNull();
    expect(screen.queryByTestId('quiz-answer-input')).toBeNull();

    unmountKvesh();

    // Standard mode (Thomthematica)
    render(<App />);
    fireEvent.click(screen.getByText('მაგალითები'));
    expect(screen.getByTestId('quiz-answer-input')).toBeDefined();
  });

  it('Q. Focus: on problem load and after advancing to next problem, focus is on the first cell ("cell-q-0")', async () => {
    const q1: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };
    const q2: MathProblem = {
      category: 'math',
      num1: 4056,
      num2: 4,
      operation: Operation.Divide,
      answer: 1014,
    };
    setupDeterministicProblems([q1, q2]);

    render(<App />);
    fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

    await waitFor(() => {
      expect(document.activeElement?.id).toBe('cell-q-0');
    });

    // Advance to q2
    fillDivision(345, 3, { wrong: false });
    submitDivision();
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    await waitFor(() => {
      expect(document.activeElement?.id).toBe('cell-q-0');
    });
  });

  it('R. Focus timer cleanup: clicking Home before focus delay cancels timer via clearTimeout', () => {
    vi.useFakeTimers();
    try {
      const q1: MathProblem = {
        category: 'math',
        num1: 345,
        num2: 3,
        operation: Operation.Divide,
        answer: 115,
      };
      setupDeterministicProblems([q1]);

      render(<App />);
      fireEvent.click(screen.getByText('ქვეშმიწერით გაყოფა ➗'));

      // Advance halfway through 120ms delay (60ms)
      act(() => {
        vi.advanceTimersByTime(60);
      });

      // Click Home button before 120ms
      const homeBtn = screen.getByTitle('მთავარი მენიუ');
      fireEvent.click(homeBtn);

      focusFirstCellSpy.mockClear();

      // Advance timers past the remaining delay
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // focusFirstCell was NOT called because clearTimeout canceled it
      expect(focusFirstCellSpy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
