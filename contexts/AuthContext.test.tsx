// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as supabaseModule from '../lib/supabase';

describe('AuthContext - FIX 2 & FIX 6 (SignUp PIN update handling & metadata hygiene)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('FIX 2: returns error when updating profiles.pin_hash fails during registration', async () => {
    const mockAuthSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-123' } },
      error: null,
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: { message: 'DB constraint failure' },
      }),
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

    let res: any;
    await act(async () => {
      res = await result.current.signUp(
        'test@example.com',
        'password123',
        'ტესტ მომხმარებელი',
        'hash-1234'
      );
    });

    expect(res.error).toBeInstanceOf(Error);
    expect(res.error.message).toBe('PIN-ის შენახვა ვერ მოხერხდა. სცადეთ ხელახლა.');
  });

  it('FIX 6: does NOT include pin_hash in auth metadata options.data on signUp', async () => {
    const mockAuthSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user-123' } },
      error: null,
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
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

    let res: any;
    await act(async () => {
      res = await result.current.signUp(
        'test@example.com',
        'password123',
        'ტესტ მომხმარებელი',
        'hash-1234'
      );
    });

    expect(res.error).toBeNull();
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
});
