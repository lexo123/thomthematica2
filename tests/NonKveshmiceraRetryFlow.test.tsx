// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from '../App';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as SessionModeContext from '../contexts/SessionModeContext';
import * as problemGenerator from '../services/problemGenerator';
import * as supabaseSyncService from '../services/supabaseSyncService';
import { GameMode, Operation, MathProblem } from '../types';
import { clearGameProgress, loadGameProgress } from '../services/gameProgressStorage';

describe('Non-Kveshmicera Question-Level Answer Recording & Timer Retry Guard', () => {
  const childId = 'child-non-kvesh-test-1';

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    clearGameProgress(childId, GameMode.Thomthematica);
    clearGameProgress(childId, GameMode.ThomravlebisTabula);
    clearGameProgress(childId, GameMode.Gethometria);

    vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({
      success: true,
    } as any);

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
        {
          id: childId,
          parent_id: 'parent-123',
          name: 'თომა',
          avatar_id: 'avatar_1',
          gender: 'boy',
          created_at: '',
        } as any,
      ],
      activeChild: {
        id: childId,
        parent_id: 'parent-123',
        name: 'თომა',
        avatar_id: 'avatar_1',
        gender: 'boy',
        created_at: '',
      } as any,
      activeChildId: childId,
      loading: false,
      hasFetchedOnce: true,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    localStorage.clear();
  });

  const nonKveshModes: Array<{
    label: string;
    menuButtonText: string;
    mode: GameMode;
    problems: MathProblem[];
  }> = [
    {
      label: 'Thomthematica',
      menuButtonText: 'თომთემატიკა',
      mode: GameMode.Thomthematica,
      problems: [
        {
          category: 'math',
          operation: Operation.Add,
          num1: 4,
          num2: 5,
          answer: 9,
          missingPart: 'result',
        },
        {
          category: 'math',
          operation: Operation.Add,
          num1: 7,
          num2: 8,
          answer: 15,
          missingPart: 'result',
        },
      ],
    },
    {
      label: 'ThomravlebisTabula',
      menuButtonText: 'თომრავლების ტაბულა',
      mode: GameMode.ThomravlebisTabula,
      problems: [
        {
          category: 'math',
          operation: Operation.Multiply,
          num1: 3,
          num2: 4,
          answer: 12,
          missingPart: 'result',
        },
        {
          category: 'math',
          operation: Operation.Multiply,
          num1: 6,
          num2: 7,
          answer: 42,
          missingPart: 'result',
        },
      ],
    },
    {
      label: 'Gethometria',
      menuButtonText: 'გეთომეტრია 📐',
      mode: GameMode.Gethometria,
      problems: [
        {
          category: 'geometry',
          figure: 'square',
          measurement: 'perimeter',
          sides: [5],
          answer: 20,
        },
        {
          category: 'geometry',
          figure: 'rectangle',
          measurement: 'area',
          sides: [4, 6],
          answer: 24,
        },
      ],
    },
  ];

  it.each(nonKveshModes)(
    '$label: repeated wrong attempts on the same question record false only once, ignore retry result, and record next question independently',
    ({ menuButtonText, mode, problems }) => {
      let callCount = 0;
      vi.spyOn(problemGenerator, 'generateProblem').mockImplementation(() => {
        const prob = problems[callCount % problems.length];
        callCount++;
        return prob;
      });

      render(<App />);
      fireEvent.click(screen.getByText(menuButtonText));

      expect(screen.getByText('0/0')).toBeDefined();

      const submitAnswer = (val: string) => {
        const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: val } });
        fireEvent.click(screen.getByRole('button', { name: /შემოწმება/ }));
      };

      // Q1 Attempt 1: wrong answer
      submitAnswer('999');
      expect(screen.getByText('0/1')).toBeDefined();

      // Click "თავიდან სცადე" to retry Q1
      fireEvent.click(screen.getByRole('button', { name: /თავიდან სცადე/ }));

      // Q1 Attempt 2: wrong answer again on the same question -> must NOT increment totalQuestions
      submitAnswer('888');
      expect(screen.getByText('0/1')).toBeDefined();

      // Click "თავიდან სცადე" to retry Q1 again
      fireEvent.click(screen.getByRole('button', { name: /თავიდან სცადე/ }));

      // Q1 Attempt 3: correct answer on retry -> transitions to Correct overlay, but score stays 0/1
      submitAnswer(String(problems[0].answer));
      expect(screen.getByText('0/1')).toBeDefined();
      expect(loadGameProgress(childId, mode)).toEqual([false]);

      // Advance to Q2 via "შემდეგი"
      fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

      // Q2 Attempt 1: correct on first try -> records true -> score becomes 1/2
      submitAnswer(String(problems[1].answer));
      expect(screen.getByText('1/2')).toBeDefined();
      expect(loadGameProgress(childId, mode)).toEqual([false, true]);
    }
  );

  it('ThomravlebisTabula: timeout → retry → timeout on the same question records false only once, and subsequent question timeout records normally (no stale closure)', () => {
    vi.useFakeTimers();

    const q1: MathProblem = {
      category: 'math',
      operation: Operation.Multiply,
      num1: 3,
      num2: 4,
      answer: 12,
      missingPart: 'result',
    };
    const q2: MathProblem = {
      category: 'math',
      operation: Operation.Multiply,
      num1: 6,
      num2: 7,
      answer: 42,
      missingPart: 'result',
    };

    let callCount = 0;
    vi.spyOn(problemGenerator, 'generateProblem').mockImplementation(() => {
      const prob = [q1, q2][callCount % 2];
      callCount++;
      return prob;
    });

    render(<App />);
    fireEvent.click(screen.getByText('თომრავლების ტაბულა'));

    expect(screen.getByText('0/0')).toBeDefined();

    // 1. Let timer expire on Q1 (attempt 1 timeout)
    act(() => {
      vi.advanceTimersByTime(problemGenerator.TIME_LIMIT * 1000);
    });

    expect(screen.getByText('დრო ამოიწურა! წააგე.')).toBeDefined();
    expect(screen.getByText('0/1')).toBeDefined();
    expect(loadGameProgress(childId, GameMode.ThomravlebisTabula)).toEqual([false]);

    // 2. Click "თავიდან სცადე" to retry Q1 (restarts timer for same question)
    fireEvent.click(screen.getByRole('button', { name: /თავიდან სცადე/ }));

    // 3. Let timer expire again on Q1 (attempt 2 timeout on same question)
    act(() => {
      vi.advanceTimersByTime(problemGenerator.TIME_LIMIT * 1000);
    });

    // Score MUST still be 0/1 (not 0/2!)
    expect(screen.getByText('დრო ამოიწურა! წააგე.')).toBeDefined();
    expect(screen.getByText('0/1')).toBeDefined();
    expect(loadGameProgress(childId, GameMode.ThomravlebisTabula)).toEqual([false]);

    // 4. Retry Q1 and answer correctly
    fireEvent.click(screen.getByRole('button', { name: /თავიდან სცადე/ }));
    const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /შემოწმება/ }));

    // Still 0/1 after solving Q1 on retry
    expect(screen.getByText('0/1')).toBeDefined();

    // 5. Click "შემდეგი" to advance to Q2 (starts timer for Q2 synchronously)
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // 6. Let timer expire on Q2 -> MUST record false for Q2 (0/2), proving no stale closure in useTimer
    act(() => {
      vi.advanceTimersByTime(problemGenerator.TIME_LIMIT * 1000);
    });

    expect(screen.getByText('0/2')).toBeDefined();
    expect(loadGameProgress(childId, GameMode.ThomravlebisTabula)).toEqual([false, false]);
  });
});
