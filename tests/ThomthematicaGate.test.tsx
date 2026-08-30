// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from '../App';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as supabaseSyncService from '../services/supabaseSyncService';

vi.mock('../services/statsService', () => ({
  sendGameStats: vi.fn().mockResolvedValue(true),
  sendWish: vi.fn().mockResolvedValue(true),
}));

describe('Phase 2.4a App.tsx Authenticated Child Gate & Mode Wiring', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });


  it('allows guest user to open game modes without child gate blocker', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
      loginWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
    });

    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [],
      activeChild: null,
      activeChildId: null,
      loading: false,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
    });

    render(<App />);

    // Click Thomthematica game mode card
    const thomModeBtn = screen.getByText('თომთემატიკა');
    fireEvent.click(thomModeBtn);

    // Should NOT show child gate blocker
    expect(screen.queryByText('აირჩიეთ ბავშვის პროფილი')).toBeNull();
    expect(screen.queryByText('დაამატეთ ბავშვის პროფილი')).toBeNull();

    // Should show game problem UI
    expect(screen.getByTestId('quiz-answer-input')).toBeDefined();
  });

  it('blocks game screens for authenticated user without active child selected', async () => {
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
        { id: 'child-1', parent_id: 'parent-123', name: 'ნიკოლოზი', avatar_id: 'avatar_1', created_at: '2026-01-01T00:00:00Z' },
      ],
      activeChild: null,
      activeChildId: null,
      loading: false,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
    });

    render(<App />);

    // Click Thomthematica game mode
    const thomModeBtn = screen.getByText('თომთემატიკა');
    fireEvent.click(thomModeBtn);

    // Should show the Child Selection Gate (with existing child)
    expect(screen.getByText('აირჩიეთ ბავშვის პროფილი')).toBeDefined();
    expect(screen.getByText('თამაშის დასაწყებად აუცილებელია ბავშვის პროფილის არჩევა.')).toBeDefined();
    expect(screen.getByText('🔄 პროფილის არჩევა')).toBeDefined();

    // Game input must NOT be mounted
    expect(screen.queryByTestId('quiz-answer-input')).toBeNull();
  });

  it('shows add child prompt when authenticated user has empty childrenList', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-123', email: 'parent@example.com' } as any,
      session: {} as any,
      loading: false,
      loginWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
    });

    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [],
      activeChild: null,
      activeChildId: null,
      loading: false,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
    });

    render(<App />);

    // Click Thomthematica game mode
    const thomModeBtn = screen.getByText('თომთემატიკა');
    fireEvent.click(thomModeBtn);

    // Should show "დაამატეთ ბავშვის პროფილი" and "➕ პროფილის დამატება"
    expect(screen.getByText('დაამატეთ ბავშვის პროფილი')).toBeDefined();
    expect(screen.getByText('➕ პროფილის დამატება')).toBeDefined();

    // Should NOT show "აირჩიეთ..." or "🔄 პროფილის არჩევა"
    expect(screen.queryByText('აირჩიეთ ბავშვის პროფილი')).toBeNull();
    expect(screen.queryByText('🔄 პროფილის არჩევა')).toBeNull();

    // Game input must NOT be mounted
    expect(screen.queryByTestId('quiz-answer-input')).toBeNull();
  });

  it('allows authenticated user with active child to play Thomthematica and sync to Supabase', async () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);

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
        { id: 'child-1', parent_id: 'parent-123', name: 'ნიკოლოზი', avatar_id: 'avatar_1', created_at: '2026-01-01T00:00:00Z' },
      ],
      activeChild: { id: 'child-1', parent_id: 'parent-123', name: 'ნიკოლოზი', avatar_id: 'avatar_1', created_at: '2026-01-01T00:00:00Z' },
      activeChildId: 'child-1',
      loading: false,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
    });

    render(<App />);

    // Click Thomthematica
    const thomModeBtn = screen.getByText('თომთემატიკა');
    fireEvent.click(thomModeBtn);

    // No blocker, input is ready
    const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    expect(input).toBeDefined();

    // Answer a question (even wrong answer triggers submit and records question count)
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.click(screen.getByText('შემოწმება'));

    // ResultOverlay appears with "შემდეგი" or "თავიდან სცადე"
    const nextBtn = screen.getByRole('button', { name: /შემდეგი|თავიდან სცადე/ });
    fireEvent.click(nextBtn);

    // Return to main menu
    const homeBtn = screen.getByTitle('მთავარი მენიუ');
    fireEvent.click(homeBtn);

    // Flush is queued sequentially, allow microtasks to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Verify session flushed with child-1 and Thomthematica
    expect(syncGameSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-1',
        gameMode: 'thomthematica',
        status: 'completed',
      })
    );
  });

});

