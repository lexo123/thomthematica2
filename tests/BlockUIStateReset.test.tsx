// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import App from '../App';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import { SessionModeProvider } from '../contexts/SessionModeContext';
import * as problemGenerator from '../services/problemGenerator';
import * as supabaseSyncService from '../services/supabaseSyncService';
import { GameMode, Operation, MathProblem } from '../types';

describe('App Block UI State Reset on Mode, Child, or Home navigation', () => {
  const childId1 = 'child-test-1';
  const childId2 = 'child-test-2';

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({
      success: true,
    } as any);

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-123', email: 'parent@example.com' } as any,
      session: { user: { id: 'parent-123' } } as any,
      loading: false,
      loginWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
    });

    vi.spyOn(problemGenerator, 'generateProblem').mockReturnValue({
      category: 'math',
      operation: Operation.Multiply,
      num1: 2,
      num2: 3,
      answer: 6,
      missingPart: 'result',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('resets block UI state (questionsInBlock, isPerfectBlock) when returning home and starting a new game', async () => {
    let currentChildId = childId1;

    vi.spyOn(ChildContext, 'useChild').mockImplementation(() => ({
      childrenList: [
        { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      ],
      activeChild: { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      activeChildId: currentChildId,
      loading: false,
      hasFetchedOnce: true,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
      childRewardImages: null,
    }));

    render(
      <SessionModeProvider initialMode="child">
        <App />
      </SessionModeProvider>
    );

    // 1. Start "მაგალითები" (Thomthematica)
    const thomModeBtn = screen.getByText('მაგალითები');
    fireEvent.click(thomModeBtn);

    // Enter INCORRECT answer "999" -> isPerfectBlock becomes false
    const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.click(screen.getByText('შემოწმება'));

    // Verify incorrect feedback is shown ("თავიდან სცადე")
    const retryBtn = screen.getByRole('button', { name: /თავიდან სცადე/ });
    expect(retryBtn).toBeDefined();

    // Click retry -> try again
    fireEvent.click(retryBtn);

    const input2 = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(input2, { target: { value: '6' } });
    fireEvent.click(screen.getByText('შემოწმება'));

    // Click next -> questionsInBlock is now 1
    const nextBtn2 = screen.getByRole('button', { name: /შემდეგი/ });
    fireEvent.click(nextBtn2);

    // 2. Click Home button to exit back to MainMenu
    const homeBtn = screen.getByTitle('მთავარი მენიუ');
    fireEvent.click(homeBtn);

    // Now on MainMenu
    expect(screen.getByText('მაგალითები')).toBeDefined();

    // 3. Start "მაგალითები" again (or another game)
    fireEvent.click(screen.getByText('მაგალითები'));

    // Answer 3 questions correctly in the new session
    for (let q = 1; q <= 3; q++) {
      const currentInput = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
      fireEvent.change(currentInput, { target: { value: '6' } });
      fireEvent.click(screen.getByText('შემოწმება'));

      if (q < 3) {
        const nextBtn = screen.getByRole('button', { name: /შემდეგი/ });
        fireEvent.click(nextBtn);
      }
    }

    // On the 3rd question of this new game, it should be a PERFECT block!
    // It should NOT show the imperfect block text: "შეცდომები გქონდა! მეფე უკმაყოფილოა."
    expect(screen.queryByText('შეცდომები გქონდა! მეფე უკმაყოფილოა.')).toBeNull();

    // The reward image overlay is displayed
    const rewardOverlay = screen.getByRole('button', { name: /შემდეგი/ });
    expect(rewardOverlay).toBeDefined();
  });

  it('resets block UI state when active child changes', () => {
    let currentChild = { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any;
    let currentChildId = childId1;

    const mockChildHook = vi.fn().mockImplementation(() => ({
      childrenList: [
        { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
        { id: childId2, parent_id: 'parent-123', name: 'ნიკოლოზი', avatar_id: 'avatar_2', gender: 'boy', created_at: '' } as any,
      ],
      activeChild: currentChild,
      activeChildId: currentChildId,
      loading: false,
      hasFetchedOnce: true,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
      childRewardImages: null,
    }));

    vi.spyOn(ChildContext, 'useChild').mockImplementation(mockChildHook);

    const { rerender } = render(
      <SessionModeProvider initialMode="child">
        <App />
      </SessionModeProvider>
    );

    // Start game as child 1
    fireEvent.click(screen.getByText('მაგალითები'));

    // Answer 1 question correctly -> questionsInBlock becomes 1
    const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '6' } });
    fireEvent.click(screen.getByText('შემოწმება'));

    // Return to main menu
    fireEvent.click(screen.getByTitle('მთავარი მენიუ'));

    // Switch active child to child 2
    currentChild = { id: childId2, parent_id: 'parent-123', name: 'ნიკოლოზი', avatar_id: 'avatar_2', gender: 'boy', created_at: '' } as any;
    currentChildId = childId2;

    rerender(
      <SessionModeProvider initialMode="child">
        <App />
      </SessionModeProvider>
    );

    // Child 2 starts game
    fireEvent.click(screen.getByText('მაგალითები'));

    // Verify first question of child 2 starts cleanly (answer input present, no reward overlay)
    expect(screen.getByTestId('quiz-answer-input')).toBeDefined();
    expect(screen.queryByText('შეცდომები გქონდა! მეფე უკმაყოფილოა.')).toBeNull();
  });
});
