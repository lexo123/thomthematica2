// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ParentDashboard } from './ParentDashboard';
import { MainMenu } from './MainMenu';
import * as useChildDashboardModule from '../hooks/useChildDashboard';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';

describe('ParentDashboard UI Component', () => {
  const mockRefetch = vi.fn().mockResolvedValue(undefined);
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockRefetch.mockClear();
    mockOnClose.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  // 1. childId === null -> "ბავშვი არ არის არჩეული", hook is still called
  it('renders "ბავშვი არ არის არჩეული" when childId is null, and hook is unconditionally invoked', () => {
    const hookSpy = vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: null,
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ParentDashboard childId={null} onClose={mockOnClose} />);

    expect(hookSpy).toHaveBeenCalledWith(null);
    expect(screen.getByText('ბავშვი არ არის არჩეული')).toBeDefined();
    expect(screen.getByText('✕ დახურვა')).toBeDefined();
  });

  // 2. loading === true -> spinner / loading indicator
  it('renders loading state when loading is true', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: null,
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ParentDashboard childId="child-1" onClose={mockOnClose} />);

    expect(screen.getByText('იტვირთება მონაცემები...')).toBeDefined();
  });

  // 3. error !== null -> error message + retry button (invoking refetch)
  it('renders error message and allows retry via refetch', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: null,
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: false,
      error: 'ქსელის შეცდომა',
      refetch: mockRefetch,
    });

    render(<ParentDashboard childId="child-1" onClose={mockOnClose} />);

    expect(screen.getByText('შეცდომა: ქსელის შეცდომა')).toBeDefined();
    const retryBtn = screen.getByText('🔄 თავიდან ცდა');
    expect(retryBtn).toBeDefined();

    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  // 4. stats === null (loading and error finished, but stats is still null) -> fallback, no crash
  it('renders fallback without crashing when stats is null after loading/error', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: null,
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ParentDashboard childId="child-1" onClose={mockOnClose} />);

    expect(screen.getByText('მონაცემები არ არის ხელმისაწვდომი')).toBeDefined();
  });

  // 5. Empty state: stats.completedSessionCount === 0
  it('renders empty sessions message when completedSessionCount is 0', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: {
        completedSessionCount: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        accuracyPercent: null,
        perfectBlocksCount: 0,
      },
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ParentDashboard childId="child-1" onClose={mockOnClose} />);

    expect(screen.getByText('ჯერ არცერთი დასრულებული სესია არ არის')).toBeDefined();
  });

  // 6. Populated stats with accuracyPercent === null
  it('renders stats with "მონაცემი არ არის" when accuracyPercent is null', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: {
        completedSessionCount: 1,
        totalQuestions: 0,
        totalCorrect: 0,
        accuracyPercent: null,
        perfectBlocksCount: 0,
      },
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ParentDashboard childId="child-1" onClose={mockOnClose} />);

    expect(screen.getByText('სესიები')).toBeDefined();
    expect(screen.getByText('მონაცემი არ არის')).toBeDefined();
  });

  // 7. Populated (Full): aggregate stats, recent sessions, and wishes
  it('renders full populated stats, recent sessions with mapped labels, and all wishes without truncation', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: {
        completedSessionCount: 5,
        totalQuestions: 200,
        totalCorrect: 190,
        accuracyPercent: 95.0,
        perfectBlocksCount: 2,
      },
      recentSessions: [
        {
          id: 'sess-1',
          child_id: 'child-1',
          game_mode: 'thomthematica',
          total_questions: 40,
          total_correct: 40,
          perfect_blocks_count: 1,
          duration_seconds: 120,
          status: 'completed',
          started_at: '2026-09-04T10:00:00Z',
          updated_at: '2026-09-04T10:02:00Z',
        },
        {
          id: 'sess-2',
          child_id: 'child-1',
          game_mode: 'kveshmicera',
          total_questions: 40,
          total_correct: 38,
          perfect_blocks_count: 0,
          duration_seconds: 140,
          status: 'completed',
          started_at: '2026-09-04T11:00:00Z',
          updated_at: '2026-09-04T11:02:00Z',
        },
      ],
      wishes: [
        {
          id: 'w-1',
          child_id: 'child-1',
          wish_text: 'დრონი',
          correct_count: 40,
          status: 'fulfilled',
          created_at: '2026-09-04T10:00:00Z',
        },
        {
          id: 'w-2',
          child_id: 'child-1',
          wish_text: 'ველოსიპედი',
          correct_count: 39,
          status: 'pending',
          created_at: '2026-09-04T11:00:00Z',
        },
      ],
      gameModeBreakdown: {},
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ParentDashboard childId="child-1" onClose={mockOnClose} />);

    // Aggregate stats checks
    expect(screen.getByText('5')).toBeDefined(); // completed sessions
    expect(screen.getByText('200')).toBeDefined(); // total questions
    expect(screen.getByText('190')).toBeDefined(); // total correct
    expect(screen.getByText('95.0%')).toBeDefined(); // accuracy formatted to 1 decimal
    expect(screen.getByText('2')).toBeDefined(); // perfect blocks

    // Recent sessions check (mapped mode labels)
    expect(screen.getByText('თომთემატიკა')).toBeDefined();
    expect(screen.getByText('40/40')).toBeDefined();
    expect(screen.getByText('ქვეშმიწერით გამრავლება')).toBeDefined();
    expect(screen.getByText('38/40')).toBeDefined();

    // Wishes check (both rendered, no slice)
    expect(screen.getByText('✨ დრონი')).toBeDefined();
    expect(screen.getByText('შესრულებულია ✅')).toBeDefined();
    expect(screen.getByText('✨ ველოსიპედი')).toBeDefined();
    expect(screen.getByText('მოლოდინში ⏳')).toBeDefined();

    // Close button check
    const closeBtn = screen.getByRole('button', { name: 'დახურვა' });
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // 8. Child-switch: mock returns distinct data for childA vs childB
  it('switches displayed data when childId prop changes from childA to childB', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockImplementation((id: string | null) => {
      if (id === 'child-A') {
        return {
          stats: {
            completedSessionCount: 1,
            totalQuestions: 40,
            totalCorrect: 40,
            accuracyPercent: 100.0,
            perfectBlocksCount: 1,
          },
          recentSessions: [
            {
              id: 'sess-A',
              child_id: 'child-A',
              game_mode: 'thomthematica',
              total_questions: 40,
              total_correct: 40,
              perfect_blocks_count: 1,
              duration_seconds: 100,
              status: 'completed',
              started_at: '2026-09-04T10:00:00Z',
              updated_at: '2026-09-04T10:02:00Z',
            },
          ],
          wishes: [
            {
              id: 'w-A',
              child_id: 'child-A',
              wish_text: 'საჩუქარი A',
              correct_count: 40,
              status: 'pending',
              created_at: '2026-09-04T10:00:00Z',
            },
          ],
          gameModeBreakdown: {},
          loading: false,
          error: null,
          refetch: mockRefetch,
        };
      }
      if (id === 'child-B') {
        return {
          stats: {
            completedSessionCount: 8,
            totalQuestions: 320,
            totalCorrect: 300,
            accuracyPercent: 93.8,
            perfectBlocksCount: 4,
          },
          recentSessions: [
            {
              id: 'sess-B',
              child_id: 'child-B',
              game_mode: 'gethometria',
              total_questions: 40,
              total_correct: 36,
              perfect_blocks_count: 0,
              duration_seconds: 150,
              status: 'completed',
              started_at: '2026-09-05T10:00:00Z',
              updated_at: '2026-09-05T10:02:00Z',
            },
          ],
          wishes: [
            {
              id: 'w-B',
              child_id: 'child-B',
              wish_text: 'საჩუქარი B',
              correct_count: 39,
              status: 'fulfilled',
              created_at: '2026-09-05T10:00:00Z',
            },
          ],
          gameModeBreakdown: {},
          loading: false,
          error: null,
          refetch: mockRefetch,
        };
      }
      return {
        stats: null,
        recentSessions: [],
        wishes: [],
        gameModeBreakdown: {},
        loading: false,
        error: null,
        refetch: mockRefetch,
      };
    });

    const { rerender } = render(<ParentDashboard childId="child-A" onClose={mockOnClose} />);

    // Verify Child A data
    expect(screen.getByText('✨ საჩუქარი A')).toBeDefined();
    expect(screen.getByText('100.0%')).toBeDefined();
    expect(screen.queryByText('✨ საჩუქარი B')).toBeNull();

    // Rerender with Child B
    rerender(<ParentDashboard childId="child-B" onClose={mockOnClose} />);

    // Verify Child B data is displayed, NOT frozen Child A data
    expect(screen.getByText('✨ საჩუქარი B')).toBeDefined();
    expect(screen.getByText('93.8%')).toBeDefined();
    expect(screen.getByText('გეთომეტრია')).toBeDefined();
    expect(screen.queryByText('✨ საჩუქარი A')).toBeNull();
  });

  // 9. Entry-point visibility: button is only visible when user && activeChildId
  it('shows dashboard button in MainMenu ONLY when user and activeChildId are present', () => {
    // A. Unauthenticated user
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
      loginWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
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
      showChildSelector: false,
      setShowChildSelector: vi.fn(),
    });

    const { rerender } = render(<MainMenu onSelectMode={vi.fn()} />);
    expect(screen.queryByText('📊 დაშბორდი')).toBeNull();

    // B. Authenticated user, but NO activeChildId
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-1', email: 'parent@example.com' } as any,
      session: {} as any,
      loading: false,
      loginWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
    });

    rerender(<MainMenu onSelectMode={vi.fn()} />);
    expect(screen.queryByText('📊 დაშბორდი')).toBeNull();

    // C. Authenticated user WITH activeChildId
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [{ id: 'child-1', parent_id: 'parent-1', name: 'თომა', avatar_id: 'boy1', created_at: '' }],
      activeChild: { id: 'child-1', parent_id: 'parent-1', name: 'თომა', avatar_id: 'boy1', created_at: '' },
      activeChildId: 'child-1',
      loading: false,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
      showChildSelector: false,
      setShowChildSelector: vi.fn(),
    });

    rerender(<MainMenu onSelectMode={vi.fn()} />);
    expect(screen.getByText('📊 დაშბორდი')).toBeDefined();
  });

  // 10. Regression: open -> close -> game-mode selection works identically
  it('opens dashboard, closes it, and game-mode selection flow works identically', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-1', email: 'parent@example.com' } as any,
      session: {} as any,
      loading: false,
      loginWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
    });
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [{ id: 'child-1', parent_id: 'parent-1', name: 'თომა', avatar_id: 'boy1', created_at: '' }],
      activeChild: { id: 'child-1', parent_id: 'parent-1', name: 'თომა', avatar_id: 'boy1', created_at: '' },
      activeChildId: 'child-1',
      loading: false,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      updateChild: vi.fn(),
      deleteChild: vi.fn(),
      refreshChildren: vi.fn(),
      showChildSelector: false,
      setShowChildSelector: vi.fn(),
    });

    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: {
        completedSessionCount: 2,
        totalQuestions: 80,
        totalCorrect: 78,
        accuracyPercent: 97.5,
        perfectBlocksCount: 1,
      },
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    const onSelectMode = vi.fn();
    render(<MainMenu onSelectMode={onSelectMode} />);

    // Initially game grid is rendered
    expect(screen.getByText('თომთემატიკა')).toBeDefined();
    expect(screen.queryByText('📊 მშობლის დაშბორდი')).toBeNull();

    // Click dashboard button
    const dashBtn = screen.getByText('📊 დაშბორდი');
    fireEvent.click(dashBtn);

    // Dashboard is now rendered replacing game grid (not overlay)
    expect(screen.getByText('📊 მშობლის დაშბორდი')).toBeDefined();
    expect(screen.queryByText('თომთემატიკა')).toBeNull();

    // Click close button on dashboard
    const closeBtn = screen.getByText('✕ დახურვა');
    fireEvent.click(closeBtn);

    // Dashboard is closed and game grid is back
    expect(screen.queryByText('📊 მშობლის დაშბორდი')).toBeNull();
    const thomModeBtn = screen.getByText('თომთემატიკა');
    expect(thomModeBtn).toBeDefined();

    // Game mode selection works identically
    fireEvent.click(thomModeBtn);
    expect(onSelectMode).toHaveBeenCalledWith('thomthematica');
  });

  // 11. Game Mode Breakdown rendering with populated data
  it('renders game mode breakdown section with formatted stats when data is populated', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: {
        completedSessionCount: 3,
        totalQuestions: 100,
        totalCorrect: 95,
        accuracyPercent: 95,
        perfectBlocksCount: 1,
      },
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {
        thomthematica: {
          sessionCount: 2,
          totalQuestions: 80,
          totalCorrect: 76,
          accuracyPercent: 95,
        },
        gethometria: {
          sessionCount: 1,
          totalQuestions: 20,
          totalCorrect: 19,
          accuracyPercent: 95,
        },
        custom_unrecognized_mode: {
          sessionCount: 1,
          totalQuestions: 10,
          totalCorrect: 8,
          accuracyPercent: 80,
        },
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ParentDashboard childId="child-1" onClose={mockOnClose} />);

    // Section title
    expect(screen.getByText('🎮 თამაშის რეჟიმები')).toBeDefined();

    // Standard mapped mode labels
    expect(screen.getByText('თომთემატიკა')).toBeDefined();
    expect(screen.getByText('76/80')).toBeDefined();
    expect(screen.getByText('სესიები: 2 • სიზუსტე: 95.0%')).toBeDefined();

    expect(screen.getByText('გეთომეტრია')).toBeDefined();
    expect(screen.getByText('19/20')).toBeDefined();
    expect(screen.getByText('სესიები: 1 • სიზუსტე: 95.0%')).toBeDefined();

    // Raw unrecognized mode fallback
    expect(screen.getByText('custom_unrecognized_mode')).toBeDefined();
    expect(screen.getByText('8/10')).toBeDefined();
    expect(screen.getByText('სესიები: 1 • სიზუსტე: 80.0%')).toBeDefined();
  });

  // 12. Game Mode Breakdown empty state when gameModeBreakdown is empty
  it('renders empty-state message when gameModeBreakdown is empty', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: {
        completedSessionCount: 1,
        totalQuestions: 40,
        totalCorrect: 38,
        accuracyPercent: 95,
        perfectBlocksCount: 0,
      },
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ParentDashboard childId="child-1" onClose={mockOnClose} />);

    expect(screen.getByText('🎮 თამაშის რეჟიმები')).toBeDefined();
    expect(screen.getByText('რეჟიმების სტატისტიკა არ მოიძებნა')).toBeDefined();
  });

  // 13. Game Mode Breakdown does NOT render in non-populated states
  it('does not render game mode breakdown in loading, error, or empty-sessions states', () => {
    // 1. Loading
    const { rerender } = render(<ParentDashboard childId="child-1" onClose={mockOnClose} />);
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: null,
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {
        thomthematica: { sessionCount: 1, totalQuestions: 40, totalCorrect: 40, accuracyPercent: 100 },
      },
      loading: true,
      error: null,
      refetch: mockRefetch,
    });
    rerender(<ParentDashboard childId="child-1" onClose={mockOnClose} />);
    expect(screen.queryByText('🎮 თამაშის რეჟიმები')).toBeNull();

    // 2. Error
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: null,
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: false,
      error: 'Some DB error',
      refetch: mockRefetch,
    });
    rerender(<ParentDashboard childId="child-1" onClose={mockOnClose} />);
    expect(screen.queryByText('🎮 თამაშის რეჟიმები')).toBeNull();

    // 3. Empty sessions
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: {
        completedSessionCount: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        accuracyPercent: null,
        perfectBlocksCount: 0,
      },
      recentSessions: [],
      wishes: [],
      gameModeBreakdown: {},
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    rerender(<ParentDashboard childId="child-1" onClose={mockOnClose} />);
    expect(screen.queryByText('🎮 თამაშის რეჟიმები')).toBeNull();
  });

  it('correctly formats wish badges for 20-block sizes (20/20 perfect and 19/20 near-perfect)', () => {
    vi.spyOn(useChildDashboardModule, 'useChildDashboard').mockReturnValue({
      stats: {
        completedSessionCount: 1,
        totalQuestions: 20,
        totalCorrect: 20,
        accuracyPercent: 100.0,
        perfectBlocksCount: 1,
      },
      recentSessions: [],
      wishes: [
        {
          id: 'w-20-perfect',
          child_id: 'child-1',
          wish_text: 'რობოტი',
          correct_count: 20,
          status: 'fulfilled',
          created_at: '2026-09-10T10:00:00Z',
        },
        {
          id: 'w-20-near',
          child_id: 'child-1',
          wish_text: 'თვითმფრინავი',
          correct_count: 19,
          status: 'pending',
          created_at: '2026-09-10T11:00:00Z',
        },
      ],
      gameModeBreakdown: {},
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<ParentDashboard childId="child-1" onClose={mockOnClose} />);

    expect(screen.getByText('⭐ 20/20 ბლოკი')).toBeDefined();
    expect(screen.getByText('🎯 19/20 ბლოკი')).toBeDefined();
    expect(screen.getByText('✨ რობოტი')).toBeDefined();
    expect(screen.getByText('✨ თვითმფრინავი')).toBeDefined();
  });
});

