// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MainMenu } from './MainMenu';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as SessionModeContext from '../contexts/SessionModeContext';

describe('MainMenu - FIX 4: Child-Switch & Identity Exit Buttons', () => {
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

  it('renders BOTH "🔄 შვილის შეცვლა" and "🔒 გასვლა identity-დან" in parent mode', () => {
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
      sessionMode: 'parent',
      setSessionMode: vi.fn(),
      resetSessionMode: resetSessionModeMock,
    });

    render(<MainMenu onSelectMode={vi.fn()} />);

    // Both buttons should be present
    const switchChildBtn = screen.getByText('🔄 შვილის შეცვლა');
    const exitIdentityBtn = screen.getByText('🔒 გასვლა identity-დან');
    expect(switchChildBtn).toBeDefined();
    expect(exitIdentityBtn).toBeDefined();

    // Dashboard button should also be visible in parent mode with activeChildId
    expect(screen.getByText('📊 დაშბორდი')).toBeDefined();

    // Clicking "🔄 შვილის შეცვლა" opens ChildSelector without resetting session
    fireEvent.click(switchChildBtn);
    expect(setShowChildSelectorMock).toHaveBeenCalledWith(true);
    expect(resetSessionModeMock).not.toHaveBeenCalled();

    // Clicking "🔒 გასვლა identity-დან" resets session and active child
    fireEvent.click(exitIdentityBtn);
    expect(resetSessionModeMock).toHaveBeenCalled();
    expect(setActiveChildIdMock).toHaveBeenCalledWith(null);
  });

  it('renders ONLY "🔒 გასვლა identity-დან" in child mode (hiding "🔄 შვილის შეცვლა" and Dashboard)', () => {
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

    // "🔒 გასვლა identity-დან" is present
    expect(screen.getByText('🔒 გასვლა identity-დან')).toBeDefined();

    // "🔄 შვილის შეცვლა" must be ABSENT in child mode
    expect(screen.queryByText('🔄 შვილის შეცვლა')).toBeNull();

    // Dashboard button must be ABSENT in child mode
    expect(screen.queryByText('📊 დაშბორდი')).toBeNull();
  });
});
