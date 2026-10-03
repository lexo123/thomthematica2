// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { deriveDashboardStats } from '../services/deriveDashboardStats';
import { deriveGameModeBreakdown } from '../services/deriveGameModeBreakdown';
import { ParentDashboard } from '../components/ParentDashboard';
import * as useChildDashboardModule from '../hooks/useChildDashboard';
import * as ChildContext from '../contexts/ChildContext';

describe('Commit 3: Dashboard includes all game_sessions (active and completed)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: 'child-1', parent_id: 'p-1', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      ],
      activeChild: { id: 'child-1', parent_id: 'p-1', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' } as any,
      activeChildId: 'child-1',
      loading: false,
      hasFetchedOnce: true,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
      childRewardImages: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  // (ა) deriveDashboardStats: active + completed row-ები ორივე ჩაითვლება:
  // sessionCount, totalQuestions, totalCorrect, perfectBlocksCount;
  it('(ა) deriveDashboardStats counts both active and completed rows: sessionCount, totalQuestions, totalCorrect, perfectBlocksCount', () => {
    const sessions = [
      { total_questions: 40, total_correct: 38, perfect_blocks_count: 1, status: 'completed' as const },
      { total_questions: 15, total_correct: 12, perfect_blocks_count: 0, status: 'active' as const },
    ];

    const stats = deriveDashboardStats(sessions);

    expect((stats as any).sessionCount).toBe(2);
    expect(stats.totalQuestions).toBe(55);
    expect(stats.totalCorrect).toBe(50);
    expect(stats.perfectBlocksCount).toBe(1);
    expect(stats.accuracyPercent).toBeCloseTo((50 / 55) * 100, 2);
  });

  // (ბ) deriveDashboardStats: მხოლოდ active row-ები → sessionCount > 0, accuracyPercent გამოთვლილია;
  it('(ბ) deriveDashboardStats with only active rows: sessionCount > 0 and accuracyPercent is calculated', () => {
    const sessions = [
      { total_questions: 20, total_correct: 16, perfect_blocks_count: 0, status: 'active' as const },
      { total_questions: 10, total_correct: 9, perfect_blocks_count: 0, status: 'active' as const },
    ];

    const stats = deriveDashboardStats(sessions);

    expect((stats as any).sessionCount).toBe(2);
    expect(stats.totalQuestions).toBe(30);
    expect(stats.totalCorrect).toBe(25);
    expect(stats.accuracyPercent).toBeCloseTo((25 / 30) * 100, 2);
  });

  // (გ) deriveGameModeBreakdown: active row ჩაითვლება თავისი game_mode-ის sessionCount-ში და accuracy-ში;
  it('(გ) deriveGameModeBreakdown counts active row in its game_mode sessionCount and accuracy', () => {
    const sessions = [
      { game_mode: 'thomthematica', total_questions: 40, total_correct: 36, status: 'completed' as const },
      { game_mode: 'thomthematica', total_questions: 10, total_correct: 8, status: 'active' as const },
      { game_mode: 'gethometria', total_questions: 15, total_correct: 12, status: 'active' as const },
    ];

    const breakdown = deriveGameModeBreakdown(sessions);

    expect(breakdown['thomthematica']).toEqual({
      sessionCount: 2,
      totalQuestions: 50,
      totalCorrect: 44,
      accuracyPercent: 88,
    });

    expect(breakdown['gethometria']).toEqual({
      sessionCount: 1,
      totalQuestions: 15,
      totalCorrect: 12,
      accuracyPercent: 80,
    });
  });

  // (დ) ParentDashboard: თუ ბავშვს მხოლოდ active row აქვს, გვერდი ცარიელ მდგომარეობას არ აჩვენებს და იჩენს რიცხვებს;
  it('(დ) ParentDashboard shows populated numbers and does not show empty state when child has only active rows', () => {
    const activeSessions = [
      { total_questions: 25, total_correct: 20, perfect_blocks_count: 1, status: 'active' as const },
    ];
    const derivedStats = deriveDashboardStats(activeSessions);

    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: derivedStats,
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: deriveGameModeBreakdown([
        { game_mode: 'thomthematica', total_questions: 25, total_correct: 20, status: 'active' as const },
      ]),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ParentDashboard childId="child-1" onClose={vi.fn()} />);

    // Must NOT show empty state message
    expect(screen.queryByText(/არცერთი.*სესია არ არის/)).toBeNull();
    // Must display populated question count "25" and correct count "20"
    expect(screen.getByText('25')).toBeDefined();
    expect(screen.getByText('20')).toBeDefined();
  });

  // (ე) ცარიელი სია → "ჯერ არცერთი სესია არ არის".
  it('(ე) ParentDashboard renders "ჯერ არცერთი სესია არ არის" when session list is empty', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: {
        sessionCount: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        accuracyPercent: null,
        perfectBlocksCount: 0,
      } as any,
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ParentDashboard childId="child-1" onClose={vi.fn()} />);

    expect(screen.getByText('ჯერ არცერთი სესია არ არის')).toBeDefined();
  });
});
