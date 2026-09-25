// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '../App';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import { SessionModeProvider } from '../contexts/SessionModeContext';
import * as poolSelector from '../utils/poolSelector';
import * as problemGenerator from '../services/problemGenerator';
import { Operation } from '../types';
import { CORRECT_PHRASES } from '../services/problemGenerator';

describe('App correct phrase pool draw behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('calls selectFromPool only on non-block-completing correct answers across multiple blocks', () => {
    const selectFromPoolSpy = vi.spyOn(poolSelector, 'selectFromPool');

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-123', email: 'parent@example.com' } as any,
      session: {} as any,
      loading: false,
      loginWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
    });

    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: 'child-1', parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '2026-01-01T00:00:00Z' },
      ],
      activeChild: { id: 'child-1', parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '2026-01-01T00:00:00Z' },
      activeChildId: 'child-1',
      loading: false,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
    });

    vi.spyOn(problemGenerator, 'generateProblem').mockReturnValue({
      category: 'math',
      operation: Operation.Multiply,
      num1: 2,
      num2: 3,
      answer: 6,
      missingPart: 'result',
    });

    render(
      <SessionModeProvider initialMode="parent">
        <App />
      </SessionModeProvider>
    );

    // Click Thomthematica to start
    const thomModeBtn = screen.getByText('თომთემატიკა');
    fireEvent.click(thomModeBtn);

    expect(selectFromPoolSpy).toHaveBeenCalledTimes(0);

    const totalQuestions = 6; // 2 full 3-question blocks
    let expectedPoolCalls = 0;

    for (let i = 1; i <= totalQuestions; i++) {
      const isBlockCompleting = i % 3 === 0;
      if (!isBlockCompleting) {
        expectedPoolCalls++;
      }

      // Enter correct answer "6"
      const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '6' } });
      fireEvent.click(screen.getByText('შემოწმება'));

      // Verify that after each question, correct phrase call count matches expected (0 added on 3rd and 6th)
      const phraseCalls = selectFromPoolSpy.mock.calls.filter(([_, source]) => source === CORRECT_PHRASES);
      expect(phraseCalls.length).toBe(expectedPoolCalls);

      // Advance to next question
      const nextBtn = screen.getByRole('button', { name: /შემდეგი/ });
      fireEvent.click(nextBtn);
    }

    // Total phrase pool calls equals total correct answers minus block-completing answers (6 - 2 = 4)
    const blockCompletingCount = Math.floor(totalQuestions / 3);
    const finalPhraseCalls = selectFromPoolSpy.mock.calls.filter(([_, source]) => source === CORRECT_PHRASES);
    expect(finalPhraseCalls.length).toBe(totalQuestions - blockCompletingCount);
  });
});
