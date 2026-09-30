// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MainMenu } from './MainMenu';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as SessionModeContext from '../contexts/SessionModeContext';
import * as supabaseSyncService from '../services/supabaseSyncService';

describe('MainMenu - Parent Control Card, Wish Inbox & Child Game Mode', () => {
  let setShowChildSelectorMock: any;
  let resetSessionModeMock: any;
  let setActiveChildIdMock: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    setShowChildSelectorMock = vi.fn();
    resetSessionModeMock = vi.fn();
    setActiveChildIdMock = vi.fn();

    vi.spyOn(supabaseSyncService, 'fetchFamilyPendingWishes').mockResolvedValue({
      data: [],
      error: null,
    });

    vi.spyOn(supabaseSyncService, 'fetchChildSafeWishes').mockResolvedValue({
      data: [],
      error: null,
    });

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-123', email: 'parent@example.com' } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      setIsPasswordRecovery: vi.fn(),
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders "📊 დაშბორდი", "➕ ბავშვის დამატება", and "🔒 გასვლა identity-დან" in parent mode without game buttons or PIN-less switch', () => {
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: 'child-1', parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' },
      ],
      activeChild: null,
      activeChildId: null,
      childRewardImages: null,
      loading: false,
      error: null,
      hasFetchedOnce: true,
      setActiveChildId: setActiveChildIdMock,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      fetchChildren: vi.fn(),
      showChildSelector: false,
      setShowChildSelector: setShowChildSelectorMock,
    });

    vi.spyOn(SessionModeContext, 'useSessionMode').mockReturnValue({
      sessionMode: 'parent',
      setSessionMode: vi.fn(),
      resetSessionMode: resetSessionModeMock,
    });

    render(<MainMenu onSelectMode={vi.fn()} />);

    // Parent controls are present
    const dashboardBtn = screen.getByText('📊 დაშბორდი');
    const addChildBtn = screen.getByText('➕ ბავშვის დამატება');
    const exitIdentityBtn = screen.getByText('🔒 გასვლა identity-დან');
    expect(dashboardBtn).toBeDefined();
    expect(addChildBtn).toBeDefined();
    expect(exitIdentityBtn).toBeDefined();

    // PIN-less child switch and game buttons must be ABSENT in parent mode
    expect(screen.queryByText(/შვილის შეცვლა|ბავშვის შეცვლა/)).toBeNull();
    expect(screen.queryByText('თომთემატიკა')).toBeNull();
    expect(screen.queryByText('თომრავლების ტაბულა')).toBeNull();
    expect(screen.queryByText('გეთომეტრია 📐')).toBeNull();
    expect(screen.queryByText('ქვეშმიწერით გამრავლება ✍️')).toBeNull();

    // Clicking "➕ ბავშვის დამატება" opens single-purpose ChildSelector
    fireEvent.click(addChildBtn);
    expect(setShowChildSelectorMock).toHaveBeenCalledWith(true);
    expect(resetSessionModeMock).not.toHaveBeenCalled();

    // Clicking "🔒 გასვლა identity-დან" resets session and active child
    fireEvent.click(exitIdentityBtn);
    expect(resetSessionModeMock).toHaveBeenCalled();
    expect(setActiveChildIdMock).toHaveBeenCalledWith(null);
  });

  it('renders game buttons and "🔒 გასვლა identity-დან" in child mode (hiding Dashboard and Add Child)', () => {
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: 'child-1', parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' },
      ],
      activeChild: { id: 'child-1', parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' },
      activeChildId: 'child-1',
      childRewardImages: null,
      loading: false,
      error: null,
      hasFetchedOnce: true,
      setActiveChildId: setActiveChildIdMock,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      fetchChildren: vi.fn(),
      showChildSelector: false,
      setShowChildSelector: setShowChildSelectorMock,
    });

    vi.spyOn(SessionModeContext, 'useSessionMode').mockReturnValue({
      sessionMode: 'child',
      setSessionMode: vi.fn(),
      resetSessionMode: resetSessionModeMock,
    });

    render(<MainMenu onSelectMode={vi.fn()} />);

    // "🔒 გასვლა identity-დან" and all 4 game buttons are present
    expect(screen.getByText('🔒 გასვლა identity-დან')).toBeDefined();
    expect(screen.getByText('თომთემატიკა')).toBeDefined();
    expect(screen.getByText('თომრავლების ტაბულა')).toBeDefined();
    expect(screen.getByText('გეთომეტრია 📐')).toBeDefined();
    expect(screen.getByText('ქვეშმიწერით გამრავლება ✍️')).toBeDefined();

    // Parent buttons must be ABSENT in child mode
    expect(screen.queryByText('📊 დაშბორდი')).toBeNull();
    expect(screen.queryByText('➕ ბავშვის დამატება')).toBeNull();
    expect(screen.queryByText(/შვილის შეცვლა|ბავშვის შეცვლა/)).toBeNull();
  });

  it('renders "📬 სურვილები (N)" badge in parent mode, opens ParentWishInbox, and updates badge count after refetch', async () => {
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: 'child-1', parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' },
      ],
      activeChild: null,
      activeChildId: null,
      childRewardImages: null,
      loading: false,
      error: null,
      hasFetchedOnce: true,
      setActiveChildId: setActiveChildIdMock,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      fetchChildren: vi.fn(),
      showChildSelector: false,
      setShowChildSelector: setShowChildSelectorMock,
    });

    vi.spyOn(SessionModeContext, 'useSessionMode').mockReturnValue({
      sessionMode: 'parent',
      setSessionMode: vi.fn(),
      resetSessionMode: resetSessionModeMock,
    });

    let fetchCall = 0;
    vi.spyOn(supabaseSyncService, 'fetchFamilyPendingWishes').mockImplementation(async () => {
      fetchCall += 1;
      if (fetchCall === 1) {
        return {
          data: [
            {
              id: 'w-1',
              child_id: 'child-1',
              wish_text: 'LEGO',
              correct_count: 40,
              status: 'wish_pending',
              created_at: '2026-09-29T09:00:00Z',
            },
            {
              id: 'w-2',
              child_id: 'child-1',
              wish_text: 'ველოსიპედი',
              correct_count: 39,
              status: 'wish_pending',
              created_at: '2026-09-29T10:00:00Z',
            },
          ],
          error: null,
        };
      }
      return {
        data: [
          {
            id: 'w-2',
            child_id: 'child-1',
            wish_text: 'ველოსიპედი',
            correct_count: 39,
            status: 'wish_pending',
            created_at: '2026-09-29T10:00:00Z',
          },
        ],
        error: null,
      };
    });

    vi.spyOn(supabaseSyncService, 'parentApproveWish').mockResolvedValue({ success: true });

    render(<MainMenu onSelectMode={vi.fn()} />);

    // Wait for initial pending wishes load -> badge shows (2)
    await waitFor(() => {
      expect(screen.getByText('📬 სურვილები (2)')).toBeDefined();
    });

    // Click button to open ParentWishInbox
    fireEvent.click(screen.getByText('📬 სურვილები (2)'));
    expect(screen.getByText('✨ LEGO')).toBeDefined();
    expect(screen.getByText('✨ ველოსიპედი')).toBeDefined();

    // Approve first wish -> triggers refetch from the same hook instance
    const approveButtons = screen.getAllByText('✅ დადასტურება');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('✨ LEGO')).toBeNull();
      expect(screen.getByText('✨ ველოსიპედი')).toBeDefined();
    });

    // Close Inbox -> return to parent menu where badge now shows (1)
    fireEvent.click(screen.getByText('✕ დახურვა'));
    expect(screen.getByText('📬 სურვილები (1)')).toBeDefined();
  });

  it('renders ChildWishStatusPanel in child mode above "აირჩიე თამაში 👑" without leaking internal status or image literals', async () => {
    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        { id: 'child-1', parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' },
      ],
      activeChild: { id: 'child-1', parent_id: 'parent-123', name: 'თომა', avatar_id: 'avatar_1', gender: 'boy', created_at: '' },
      activeChildId: 'child-1',
      childRewardImages: null,
      loading: false,
      error: null,
      hasFetchedOnce: true,
      setActiveChildId: setActiveChildIdMock,
      setActiveChild: vi.fn(),
      addChild: vi.fn(),
      fetchChildren: vi.fn(),
      showChildSelector: false,
      setShowChildSelector: setShowChildSelectorMock,
    });

    vi.spyOn(SessionModeContext, 'useSessionMode').mockReturnValue({
      sessionMode: 'child',
      setSessionMode: vi.fn(),
      resetSessionMode: resetSessionModeMock,
    });

    vi.spyOn(supabaseSyncService, 'fetchChildSafeWishes').mockResolvedValue({
      data: [
        {
          id: 'cw-1',
          wish_text: 'დრონი',
          status: 'wish_rejected',
          wish_parent_note: 'სხვა მოიფიქრე',
          correct_count: 40,
          created_at: '2026-09-29T08:00:00Z',
        },
        {
          id: 'cw-2',
          wish_text: 'ველოსიპედი',
          status: 'image_pending',
          wish_parent_note: null,
          correct_count: 40,
          created_at: '2026-09-29T09:00:00Z',
        },
        {
          id: 'cw-3',
          wish_text: 'რობოტი',
          status: 'published',
          wish_parent_note: null,
          correct_count: 40,
          created_at: '2026-09-29T07:00:00Z',
        },
      ],
      error: null,
    });

    const { container } = render(<MainMenu onSelectMode={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('შენი სურვილი: „დრონი"')).toBeDefined();
      expect(screen.getByText('მშობლის კომენტარი: სხვა მოიფიქრე')).toBeDefined();
      expect(screen.getByText('1 სურვილი მშობელთან გაიგზავნა')).toBeDefined();
    });

    expect(screen.getByText('აირჩიე თამაში 👑')).toBeDefined();

    const renderedText = container.textContent ?? '';
    for (const forbidden of [
      'wish_pending',
      'wish_approved',
      'image_pending',
      'image_approved',
      'image_rejected',
      'proposed_image_path',
      'image_parent_note',
    ]) {
      expect(renderedText).not.toContain(forbidden);
    }
  });
});
