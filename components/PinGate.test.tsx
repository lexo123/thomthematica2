// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { PinGate } from './PinGate';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as SessionModeContext from '../contexts/SessionModeContext';
import * as supabaseModule from '../lib/supabase';

// Real SHA-256 hashes:
// SHA-256('1234')
const HASH_PARENT_1234 = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
// SHA-256('5678')
const HASH_CHILD_5678 = 'f8638b979b2f4f793ddb6dbd197e0ee25a7a6ea32b0ae22f5e3c5d119d839e75';

describe('PinGate Component', () => {
  let setSessionModeMock: any;
  let resetSessionModeMock: any;
  let setActiveChildIdMock: any;
  let signOutMock: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    setSessionModeMock = vi.fn();
    resetSessionModeMock = vi.fn();
    setActiveChildIdMock = vi.fn();
    signOutMock = vi.fn();

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'parent-123', email: 'parent@example.com', user_metadata: { full_name: 'გიორგი' } } as any,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      setIsPasswordRecovery: vi.fn(),
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: signOutMock,
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
    });

    vi.spyOn(ChildContext, 'useChild').mockReturnValue({
      childrenList: [
        {
          id: 'child-abc',
          parent_id: 'parent-123',
          name: 'თომა',
          avatar_id: 'avatar_1',
          gender: 'boy',
          created_at: '2026-01-01T00:00:00Z',
          pin_hash: HASH_CHILD_5678,
        },
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
      setShowChildSelector: vi.fn(),
    });

    vi.spyOn(SessionModeContext, 'useSessionMode').mockReturnValue({
      sessionMode: null,
      setSessionMode: setSessionModeMock,
      resetSessionMode: resetSessionModeMock,
    });

    // Mock supabase select for profiles.pin_hash
    const mockSingle = vi.fn().mockResolvedValue({
      data: { pin_hash: HASH_PARENT_1234 },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockSingle, single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      from: mockFrom,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders PinGate with title, input boxes and user name', async () => {
    render(<PinGate />);

    expect(screen.getByText('შეიყვანეთ PIN კოდი')).toBeDefined();
    expect(screen.getByText('გიორგი')).toBeDefined();
    expect(screen.getByText('🚪 გასვლა ანგარიშიდან')).toBeDefined();
  });

  it('transitions to parent mode when correct parent PIN is entered', async () => {
    render(<PinGate />);

    // Click keypad digits: 1, 2, 3, 4
    await act(async () => {
      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('4'));
    });

    // Allow crypto subtle promise to resolve
    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    expect(setSessionModeMock).toHaveBeenCalledWith('parent');
    expect(setActiveChildIdMock).not.toHaveBeenCalled();
  });

  it('transitions to child mode and sets active child when child PIN is entered', async () => {
    render(<PinGate />);

    // Click keypad digits: 5, 6, 7, 8
    await act(async () => {
      fireEvent.click(screen.getByText('5'));
      fireEvent.click(screen.getByText('6'));
      fireEvent.click(screen.getByText('7'));
      fireEvent.click(screen.getByText('8'));
    });

    // Allow crypto subtle promise to resolve
    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    expect(setActiveChildIdMock).toHaveBeenCalledWith('child-abc');
    expect(setSessionModeMock).toHaveBeenCalledWith('child');
  });

  it('shows generic "არასწორი PIN" error when incorrect PIN is entered', async () => {
    render(<PinGate />);

    // Enter wrong PIN: 9, 9, 9, 9
    await act(async () => {
      fireEvent.click(screen.getByText('9'));
      fireEvent.click(screen.getByText('9'));
      fireEvent.click(screen.getByText('9'));
      fireEvent.click(screen.getByText('9'));
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    expect(screen.getByText('არასწორი PIN')).toBeDefined();
    expect(setSessionModeMock).not.toHaveBeenCalled();
    expect(setActiveChildIdMock).not.toHaveBeenCalled();
  });

  it('clears pin when clear button is clicked', async () => {
    render(<PinGate />);

    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));

    const clearBtn = screen.getByTitle('გასუფთავება');
    fireEvent.click(clearBtn);

    // After clearing, clicking submit does not proceed
    expect(screen.queryByText('შესვლა 🚀')).toBeNull();
  });

  it('calls resetSessionMode, setActiveChildId(null) and signOut on logout click', async () => {
    render(<PinGate />);

    const logoutBtn = screen.getByText('🚪 გასვლა ანგარიშიდან');
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    expect(resetSessionModeMock).toHaveBeenCalled();
    expect(setActiveChildIdMock).toHaveBeenCalledWith(null);
    expect(signOutMock).toHaveBeenCalled();
  });
});
