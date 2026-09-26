// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MainMenu } from './MainMenu';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as SessionModeContext from '../contexts/SessionModeContext';

describe('MainMenu - Parent Control Card vs Child Game Mode & Identity Exit', () => {
  let setShowChildSelectorMock: any;
  let resetSessionModeMock: any;
  let setActiveChildIdMock: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    setShowChildSelectorMock = vi.fn();
    resetSessionModeMock = vi.fn();
    setActiveChildIdMock = vi.fn();

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
});
