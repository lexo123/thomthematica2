// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '../App';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import { SessionModeProvider } from '../contexts/SessionModeContext';
import * as problemGenerator from '../services/problemGenerator';
import * as supabaseSyncService from '../services/supabaseSyncService';
import { GameMode, GameState, Operation } from '../types';

vi.mock('../components/ResultOverlay', () => ({
  ResultOverlay: ({
    gameState,
    onReset,
    showImage,
    isPerfectBlock,
    consecutivePerfectBlocks,
  }: any) => {
    if (gameState === GameState.Playing) return null;
    return (
      <div
        data-testid="overlay"
        data-perfect={String(isPerfectBlock)}
        data-show-image={String(showImage)}
        data-consecutive={String(consecutivePerfectBlocks)}
      >
        <button onClick={onReset}>
          {gameState === GameState.Correct ? 'შემდეგი' : 'თავიდან სცადე'}
        </button>
      </div>
    );
  },
}));

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

  // (ა) თამაშ A-ში არასწორი პასუხი → მთავარი მენიუ → თამაში B → 3 სწორი პასუხი →
  // მესამე სწორი პასუხისას overlay: data-show-image="true" და data-perfect="true".
  it('(ა) resets isPerfectBlock to true when returning home and completing 3 correct answers in game B', () => {
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      ],
      activeChild: { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      activeChildId: childId1,
      loading: false,
      hasFetchedOnce: true,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
      childRewardImages: null,
    });

    render(
      <SessionModeProvider initialMode="child">
        <App />
      </SessionModeProvider>
    );

    // Start Game A ("მაგალითები")
    fireEvent.click(screen.getByText('მაგალითები'));

    // Answer incorrectly in Game A
    const inputA = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(inputA, { target: { value: '999' } });
    fireEvent.click(screen.getByText('შემოწმება'));

    const overlayA = screen.getByTestId('overlay');
    expect(overlayA.getAttribute('data-perfect')).toBe('false');

    // Dismiss incorrect feedback
    fireEvent.click(screen.getByRole('button', { name: /თავიდან სცადე/ }));

    // Click Home button to return to MainMenu
    fireEvent.click(screen.getByTitle('მთავარი მენიუ'));
    expect(screen.getByText('მაგალითები')).toBeDefined();

    // Start Game B ("გამრავლების ტაბულა")
    fireEvent.click(screen.getByText('გამრავლების ტაბულა'));

    // Answer 3 questions correctly in Game B
    for (let q = 1; q <= 3; q++) {
      const currentInput = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
      fireEvent.change(currentInput, { target: { value: '6' } });
      fireEvent.click(screen.getByText('შემოწმება'));

      const overlay = screen.getByTestId('overlay');
      if (q < 3) {
        expect(overlay.getAttribute('data-show-image')).toBe('false');
        fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
      } else {
        // On 3rd question: reward image shown and block is perfect!
        expect(overlay.getAttribute('data-show-image')).toBe('true');
        expect(overlay.getAttribute('data-perfect')).toBe('true');
      }
    }
  });

  // (ბ) თამაშ A-ში 2 სწორი → მენიუ → თამაში B → 1 სწორი: data-show-image="false";
  // მესამე სწორი პასუხისას "true" (ბლოკი 0-დან დაიწყო).
  it('(ბ) resets questionsInBlock to 0 so game B starts fresh and does not show image until 3rd question', () => {
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      ],
      activeChild: { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      activeChildId: childId1,
      loading: false,
      hasFetchedOnce: true,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
      childRewardImages: null,
    });

    render(
      <SessionModeProvider initialMode="child">
        <App />
      </SessionModeProvider>
    );

    // Start Game A ("მაგალითები")
    fireEvent.click(screen.getByText('მაგალითები'));

    // Answer 2 questions correctly in Game A
    for (let q = 1; q <= 2; q++) {
      const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '6' } });
      fireEvent.click(screen.getByText('შემოწმება'));
      fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
    }

    // Return to MainMenu
    fireEvent.click(screen.getByTitle('მთავარი მენიუ'));

    // Start Game B ("გამრავლების ტაბულა")
    fireEvent.click(screen.getByText('გამრავლების ტაბულა'));

    // Question 1 in Game B: must NOT show reward image!
    const inputB1 = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(inputB1, { target: { value: '6' } });
    fireEvent.click(screen.getByText('შემოწმება'));

    const overlay1 = screen.getByTestId('overlay');
    expect(overlay1.getAttribute('data-show-image')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Question 2 in Game B
    const inputB2 = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(inputB2, { target: { value: '6' } });
    fireEvent.click(screen.getByText('შემოწმება'));

    const overlay2 = screen.getByTestId('overlay');
    expect(overlay2.getAttribute('data-show-image')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Question 3 in Game B: now it should show reward image!
    const inputB3 = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(inputB3, { target: { value: '6' } });
    fireEvent.click(screen.getByText('შემოწმება'));

    const overlay3 = screen.getByTestId('overlay');
    expect(overlay3.getAttribute('data-show-image')).toBe('true');
    expect(overlay3.getAttribute('data-perfect')).toBe('true');
  });

  // (გ) ბავშვის შეცვლა არასწორი პასუხის შემდეგ → ახალი ბავშვის 3 სწორი პასუხი: data-perfect="true".
  it('(გ) resets isPerfectBlock when switching active child after an incorrect answer', () => {
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

    // Start game as Child 1
    fireEvent.click(screen.getByText('მაგალითები'));

    // Child 1 answers incorrectly
    const input1 = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(input1, { target: { value: '999' } });
    fireEvent.click(screen.getByText('შემოწმება'));

    const overlayFail = screen.getByTestId('overlay');
    expect(overlayFail.getAttribute('data-perfect')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /თავიდან სცადე/ }));

    // Return to main menu
    fireEvent.click(screen.getByTitle('მთავარი მენიუ'));

    // Switch active child to Child 2
    currentChild = { id: childId2, parent_id: 'parent-123', name: 'ნიკოლოზი', avatar_id: 'avatar_2', gender: 'boy', created_at: '' } as any;
    currentChildId = childId2;

    rerender(
      <SessionModeProvider initialMode="child">
        <App />
      </SessionModeProvider>
    );

    // Child 2 starts game
    fireEvent.click(screen.getByText('მაგალითები'));

    // Child 2 answers 3 questions correctly
    for (let q = 1; q <= 3; q++) {
      const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '6' } });
      fireEvent.click(screen.getByText('შემოწმება'));

      const overlay = screen.getByTestId('overlay');
      if (q < 3) {
        expect(overlay.getAttribute('data-show-image')).toBe('false');
        fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
      } else {
        expect(overlay.getAttribute('data-show-image')).toBe('true');
        expect(overlay.getAttribute('data-perfect')).toBe('true');
      }
    }
  });

  // (დ) mode-ის არჩევისას generateProblem (spy-ით, mock-ის გარეშე ან mock-ზე
  // toHaveBeenLastCalledWith) გამოიძახება (newMode, 0)-ით.
  it('(დ) calls generateProblem with (newMode, 0) when selecting a mode', () => {
    const generateSpy = vi.spyOn(problemGenerator, 'generateProblem').mockReturnValue({
      category: 'math',
      operation: Operation.Multiply,
      num1: 2,
      num2: 3,
      answer: 6,
      missingPart: 'result',
    });

    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      ],
      activeChild: { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      activeChildId: childId1,
      loading: false,
      hasFetchedOnce: true,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
      childRewardImages: null,
    });

    render(
      <SessionModeProvider initialMode="child">
        <App />
      </SessionModeProvider>
    );

    // Click GameMode "გამრავლების ტაბულა"
    fireEvent.click(screen.getByText('გამრავლების ტაბულა'));

    expect(generateSpy).toHaveBeenLastCalledWith(GameMode.ThomravlebisTabula, 0);

    // Answer 1 question correctly to advance questionsInBlock
    const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '6' } });
    fireEvent.click(screen.getByText('შემოწმება'));
    fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));

    // Now return Home
    fireEvent.click(screen.getByTitle('მთავარი მენიუ'));

    // Select another mode "გეომეტრია"
    fireEvent.click(screen.getByRole('button', { name: /გეომეტრია/ }));

    // generateProblem MUST have been called with 0, NOT 1
    expect(generateSpy).toHaveBeenLastCalledWith(GameMode.Gethometria, 0);
  });

  // (ე) data-consecutive="0" თამაშის შეცვლის შემდეგ, თუ A-ში უკვე ერთი სუფთა ბლოკი იყო დასრულებული.
  it('(ე) resets consecutivePerfectBlocks to 0 on game change after completing a perfect block in game A', () => {
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      ],
      activeChild: { id: childId1, parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      activeChildId: childId1,
      loading: false,
      hasFetchedOnce: true,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
      childRewardImages: null,
    });

    render(
      <SessionModeProvider initialMode="child">
        <App />
      </SessionModeProvider>
    );

    // Start Game A ("მაგალითები")
    fireEvent.click(screen.getByText('მაგალითები'));

    // Complete 1 perfect block (3 correct answers) in Game A
    for (let q = 1; q <= 3; q++) {
      const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '6' } });
      fireEvent.click(screen.getByText('შემოწმება'));

      const overlay = screen.getByTestId('overlay');
      if (q < 3) {
        fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
      } else {
        // 3rd question: consecutivePerfectBlocks is 1
        expect(overlay.getAttribute('data-consecutive')).toBe('1');
        fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
      }
    }

    // Return to MainMenu
    fireEvent.click(screen.getByTitle('მთავარი მენიუ'));

    // Start Game B ("გამრავლების ტაბულა")
    fireEvent.click(screen.getByText('გამრავლების ტაბულა'));

    // Answer 3 correct questions in Game B: first 2 questions should have data-consecutive="0"
    for (let q = 1; q <= 3; q++) {
      const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '6' } });
      fireEvent.click(screen.getByText('შემოწმება'));

      const overlay = screen.getByTestId('overlay');
      if (q < 3) {
        expect(overlay.getAttribute('data-consecutive')).toBe('0');
        fireEvent.click(screen.getByRole('button', { name: /შემდეგი/ }));
      } else {
        // On 3rd question of Game B, consecutive blocks count is 1 (fresh from 0, not 2!)
        expect(overlay.getAttribute('data-consecutive')).toBe('1');
      }
    }
  });
});
