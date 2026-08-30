// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from '../App';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as supabaseSyncService from '../services/supabaseSyncService';
import * as statsService from '../services/statsService';

vi.mock('../services/statsService', () => ({
  sendGameStats: vi.fn().mockResolvedValue(true),
  sendWish: vi.fn().mockResolvedValue(true),
}));

describe('Phase 2.4b Game Modes Gate & activeChildId Propagation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const gameModesList = [
    { name: 'თომთემატიკა', expectedMode: 'thomthematica' },
    { name: 'თომრავლების ტაბულა', expectedMode: 'thomravlebis_tabula' },
    { name: 'გეთომეტრია 📐', expectedMode: 'gethometria' },
    { name: 'ქვეშმიწერით გამრავლება ✍️', expectedMode: 'kveshmicera' },
  ];

  it.each(gameModesList)('blocks $name when authenticated user has no active child selected', async ({ name }) => {
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

    const modeBtn = screen.getByText(name);
    fireEvent.click(modeBtn);

    // Gate should block
    expect(screen.getByText('აირჩიეთ ბავშვის პროფილი')).toBeDefined();
    expect(screen.getByText('🔄 პროფილის არჩევა')).toBeDefined();
  });

  it.each(gameModesList)('allows Guest user to access $name without Gate blocker', async ({ name }) => {
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

    const modeBtn = screen.getByText(name);
    fireEvent.click(modeBtn);

    // Gate should NOT appear
    expect(screen.queryByText('აირჩიეთ ბავშვის პროფილი')).toBeNull();
    expect(screen.queryByText('დაამატეთ ბავშვის პროფილი')).toBeNull();
  });

  it('End-to-End DOM test on Kveshmicera with authenticated active child (Click -> Answer -> Home -> Supabase flush)', async () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);
    const sendGameStatsSpy = vi.spyOn(statsService, 'sendGameStats').mockResolvedValue(true as any);

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
        { id: 'child-kvesh-1', parent_id: 'parent-123', name: 'სანდრო', avatar_id: 'avatar_2', created_at: '2026-01-01T00:00:00Z' },
      ],
      activeChild: { id: 'child-kvesh-1', parent_id: 'parent-123', name: 'სანდრო', avatar_id: 'avatar_2', created_at: '2026-01-01T00:00:00Z' },
      activeChildId: 'child-kvesh-1',
      loading: false,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
    });

    render(<App />);

    // 1. Click Kveshmicera mode
    const kveshModeBtn = screen.getByText('ქვეშმიწერით გამრავლება ✍️');
    fireEvent.click(kveshModeBtn);

    // 2. Kveshmicera grid should be visible
    expect(screen.queryByText('აირჩიეთ ბავშვის პროფილი')).toBeNull();

    // Fill all inputs in Kveshmicera grid
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThan(0);

    inputs.forEach((input) => {
      fireEvent.change(input, { target: { value: '5' } });
    });

    // Submit answer in Kveshmicera
    const checkBtn = screen.getByRole('button', { name: /შემოწმება/ });
    fireEvent.click(checkBtn);

    // Click "შემდეგი" / "თავიდან სცადე"
    const nextBtn = screen.getByRole('button', { name: /შემდეგი|თავიდან სცადე/ });
    fireEvent.click(nextBtn);

    // 3. Return to Main Menu (Home)
    const homeBtn = screen.getByTitle('მთავარი მენიუ');
    fireEvent.click(homeBtn);

    // Allow async microtasks
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // 4. Verify Supabase was called with Kveshmicera and child-kvesh-1
    expect(syncGameSessionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        childId: 'child-kvesh-1',
        gameMode: 'kveshmicera',
        status: 'completed',
      })
    );

    // Verify Google Sheets was NOT called
    expect(sendGameStatsSpy).not.toHaveBeenCalled();
  });

  it('Guest regression test: Kveshmicera syncs to Google Sheets when played by guest', async () => {
    const syncGameSessionSpy = vi.spyOn(supabaseSyncService, 'syncGameSessionToSupabase').mockResolvedValue({ success: true } as any);
    const sendGameStatsSpy = vi.spyOn(statsService, 'sendGameStats').mockResolvedValue(true as any);

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

    // 1. Open Gethometria as Guest
    const gethoModeBtn = screen.getByText('გეთომეტრია 📐');
    fireEvent.click(gethoModeBtn);

    // 2. Answer question
    const input = screen.getByTestId('quiz-answer-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.click(screen.getByText('შემოწმება'));

    const nextBtn = screen.getByRole('button', { name: /შემდეგი|თავიდან სცადე/ });
    fireEvent.click(nextBtn);

    // 3. Return home
    const homeBtn = screen.getByTitle('მთავარი მენიუ');
    fireEvent.click(homeBtn);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // 4. Verify Google Sheets sync called, Supabase NOT called
    expect(sendGameStatsSpy).toHaveBeenCalledWith('gethometria', 1, expect.any(Number));
    expect(syncGameSessionSpy).not.toHaveBeenCalled();
  });
});
