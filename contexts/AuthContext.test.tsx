// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as AuthContextModule from './AuthContext';
import { AuthModal } from '../components/AuthModal';
import * as supabaseModule from '../lib/supabase';

describe('AuthContext - SignUp PIN update verification & metadata hygiene', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('(a) returns error: null and pinSaved: true when profiles.pin_hash update affects 1 row', async () => {
    const mockAuthSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-123' } },
      error: null,
    });

    const mockSelect = vi.fn().mockResolvedValue({
      data: [{ id: 'new-user-123' }],
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({
      select: mockSelect,
    });
    const mockUpdate = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { update: mockUpdate };
      }
      return { select: vi.fn() };
    });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      auth: {
        signUp: mockAuthSignUp,
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: mockFrom,
    } as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let res: { error: Error | null; pinSaved: boolean } | undefined;
    await act(async () => {
      res = await result.current.signUp(
        'test@example.com',
        'password123',
        'ტესტ მომხმარებელი',
        'hash-1234'
      );
    });

    expect(res).toEqual({ error: null, pinSaved: true });
    expect(mockUpdate).toHaveBeenCalledWith({ pin_hash: 'hash-1234' });
    expect(mockEq).toHaveBeenCalledWith('id', 'new-user-123');
    expect(mockSelect).toHaveBeenCalledWith('id');
  });

  it('(b) returns error: null and pinSaved: false when profiles.pin_hash update returns 0 rows with error: null', async () => {
    const mockAuthSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-123' } },
      error: null,
    });

    const mockSelect = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({
      select: mockSelect,
    });
    const mockUpdate = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { update: mockUpdate };
      }
      return { select: vi.fn() };
    });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      auth: {
        signUp: mockAuthSignUp,
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: mockFrom,
    } as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let res: { error: Error | null; pinSaved: boolean } | undefined;
    await act(async () => {
      res = await result.current.signUp(
        'test@example.com',
        'password123',
        'ტესტ მომხმარებელი',
        'hash-1234'
      );
    });

    expect(res).toEqual({ error: null, pinSaved: false });
    expect(mockSelect).toHaveBeenCalledWith('id');
  });

  it('(c) FIX 2 updated: returns error: null and pinSaved: false when updating profiles.pin_hash returns a DB error', async () => {
    const mockAuthSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-123' } },
      error: null,
    });

    const mockSelect = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'DB constraint failure' },
    });
    const mockEq = vi.fn().mockReturnValue({
      select: mockSelect,
    });
    const mockUpdate = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { update: mockUpdate };
      }
      return { select: vi.fn() };
    });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      auth: {
        signUp: mockAuthSignUp,
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: mockFrom,
    } as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let res: { error: Error | null; pinSaved: boolean } | undefined;
    await act(async () => {
      res = await result.current.signUp(
        'test@example.com',
        'password123',
        'ტესტ მომხმარებელი',
        'hash-1234'
      );
    });

    expect(res).toEqual({ error: null, pinSaved: false });
    expect(mockSelect).toHaveBeenCalledWith('id');
  });

  it('(d) returns error and pinSaved: false when auth.signUp itself fails', async () => {
    const mockAuthSignUp = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    });

    const mockUpdate = vi.fn();

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      auth: {
        signUp: mockAuthSignUp,
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let res: { error: Error | null; pinSaved: boolean } | undefined;
    await act(async () => {
      res = await result.current.signUp(
        'test@example.com',
        'password123',
        'ტესტ მომხმარებელი',
        'hash-1234'
      );
    });

    expect(res?.error).toBeInstanceOf(Error);
    expect(res?.error?.message).toBe('User already registered');
    expect(res?.pinSaved).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('FIX 6: does NOT include pin_hash in auth metadata options.data on signUp', async () => {
    const mockAuthSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-123' } },
      error: null,
    });

    const mockSelect = vi.fn().mockResolvedValue({
      data: [{ id: 'new-user-123' }],
      error: null,
    });
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      auth: {
        signUp: mockAuthSignUp,
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
    } as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let res: { error: Error | null; pinSaved: boolean } | undefined;
    await act(async () => {
      res = await result.current.signUp(
        'test@example.com',
        'password123',
        'ტესტ მომხმარებელი',
        'hash-1234'
      );
    });

    expect(res?.error).toBeNull();
    expect(res?.pinSaved).toBe(true);
    expect(mockAuthSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: {
          full_name: 'ტესტ მომხმარებელი',
        },
      },
    });
  });

  it('AuthModal shows fallback message "ანგარიში შეიქმნა. PIN-ს პირველ შესვლაზე დააყენებთ." when pinSaved is false', async () => {
    const signUpMock = vi.fn().mockResolvedValue({ error: null, pinSaved: false });
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      isPasswordRecovery: false,
      setIsPasswordRecovery: vi.fn(),
      signUp: signUpMock,
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
    });

    render(<AuthModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('დარეგისტრირდით'));

    fireEvent.change(screen.getByPlaceholderText('მაგ. გიორგი'), { target: { value: 'გიორგი' } });
    fireEvent.change(screen.getByPlaceholderText('parent@example.com'), { target: { value: 'parent@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });

    const pinInputs = screen.getAllByPlaceholderText('••••');
    fireEvent.change(pinInputs[0], { target: { value: '1234' } });
    fireEvent.change(pinInputs[1], { target: { value: '1234' } });

    fireEvent.click(screen.getByRole('button', { name: 'რეგისტრაცია' }));

    await waitFor(() => {
      expect(screen.getByText('ანგარიში შეიქმნა. PIN-ს პირველ შესვლაზე დააყენებთ.')).toBeDefined();
    });
  });
});
