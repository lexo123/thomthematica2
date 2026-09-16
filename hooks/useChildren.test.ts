// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChildren } from './useChildren';
import { Child } from '../types';

let currentAuthUser: { id: string; email?: string } | null = null;
let mockSupabaseClient: any = null;

const querySpy = vi.fn();
type QueryCall = {
  parentId: string;
  resolve: (value: { data: Child[] | null; error: any }) => void;
  reject: (reason: any) => void;
  promise: Promise<{ data: Child[] | null; error: any }>;
};
let queryCalls: QueryCall[] = [];

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: currentAuthUser,
  }),
}));

vi.mock('../lib/supabase', () => ({
  getSupabase: () => mockSupabaseClient,
}));

const createMockSupabase = () => ({
  from: vi.fn((table: string) => ({
    select: vi.fn((cols: string) => ({
      eq: vi.fn((field: string, val: string) => ({
        order: vi.fn((orderCol: string, opts: any) => {
          querySpy(table, field, val, orderCol, opts);
          let resolveFn!: (val: any) => void;
          let rejectFn!: (err: any) => void;
          const promise = new Promise<{ data: Child[] | null; error: any }>((res, rej) => {
            resolveFn = res;
            rejectFn = rej;
          });
          queryCalls.push({
            parentId: val,
            resolve: resolveFn,
            reject: rejectFn,
            promise,
          });
          return promise;
        }),
      })),
    })),
  })),
});

const mockChildA: Child = {
  id: 'child-a',
  parent_id: 'user-a',
  name: 'თომა',
  avatar_id: 'avatar_1',
  gender: 'boy',
  created_at: '2026-01-01T00:00:00Z',
};

const mockChildB: Child = {
  id: 'child-b',
  parent_id: 'user-b',
  name: 'ნიტა',
  avatar_id: 'avatar_2',
  gender: 'girl',
  created_at: '2026-01-02T00:00:00Z',
};

describe('useChildren - Multi-Account Login Switch & In-Flight Race Condition Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryCalls = [];
    currentAuthUser = null;
    mockSupabaseClient = createMockSupabase();
  });

  // 1. A → logout → B, B-ს fetch pending: B-ს render-ის შემდეგ, B-ს fetch-ის დასრულებამდე — hasFetchedOnce === false.
  //    B-ს fetch-ის resolve-ის შემდეგ — hasFetchedOnce === true, children === B-ს რეალური სია (არა A-ს).
  it('1. A -> logout -> B with B fetch pending: hasFetchedOnce is false while B fetch is pending, then true with B children after resolve', async () => {
    currentAuthUser = { id: 'user-a' };
    const { result, rerender } = renderHook(
      ({ user }: { user: { id: string } | null }) => {
        currentAuthUser = user;
        return useChildren();
      },
      { initialProps: { user: currentAuthUser } }
    );

    // Initial fetch for User A is pending
    expect(queryCalls.length).toBe(1);
    expect(queryCalls[0].parentId).toBe('user-a');
    expect(result.current.loading).toBe(true);

    // Resolve A's query
    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });

    await waitFor(() => {
      expect(result.current.hasFetchedOnce).toBe(true);
      expect(result.current.children).toEqual([mockChildA]);
      expect(result.current.loading).toBe(false);
    });

    // Step 2: Logout (user = null)
    rerender({ user: null });
    await waitFor(() => {
      expect(result.current.children).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    // Step 3: Login as User B
    rerender({ user: { id: 'user-b' } });

    // CRITICAL: B's fetch is pending; hasFetchedOnce MUST be false for User B!
    expect(result.current.hasFetchedOnce).toBe(false);
    expect(result.current.loading).toBe(true);
    expect(queryCalls.length).toBe(2);
    expect(queryCalls[1].parentId).toBe('user-b');

    // Step 4: Resolve B's query
    await act(async () => {
      queryCalls[1].resolve({ data: [mockChildB], error: null });
    });

    await waitFor(() => {
      expect(result.current.hasFetchedOnce).toBe(true);
      expect(result.current.children).toEqual([mockChildB]);
      expect(result.current.loading).toBe(false);
    });
  });

  // 2. A pending → B login → B resolves პირველი → A resolves მოგვიანებით (ყველაზე კრიტიკული):
  //    B-ს state სწორად აისახება; A-ს დაგვიანებული response საერთოდ არ ცვლის არცერთ state-ს
  //    (children/loading/hasFetchedOnce/fetchedForUserId) — მისი resolve-ის შემდეგაც.
  it('2. A pending -> B login -> B resolves first -> A resolves later: A late response does not overwrite B state', async () => {
    currentAuthUser = { id: 'user-a' };
    const { result, rerender } = renderHook(
      ({ user }: { user: { id: string } | null }) => {
        currentAuthUser = user;
        return useChildren();
      },
      { initialProps: { user: currentAuthUser } }
    );

    // A's request is pending
    expect(queryCalls.length).toBe(1);
    expect(queryCalls[0].parentId).toBe('user-a');
    expect(result.current.loading).toBe(true);

    // B logs in while A is still pending
    rerender({ user: { id: 'user-b' } });

    expect(queryCalls.length).toBe(2);
    expect(queryCalls[1].parentId).toBe('user-b');

    // B resolves first
    await act(async () => {
      queryCalls[1].resolve({ data: [mockChildB], error: null });
    });

    await waitFor(() => {
      expect(result.current.hasFetchedOnce).toBe(true);
      expect(result.current.children).toEqual([mockChildB]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    // Now A resolves late (stale in-flight response)
    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });

    // Verify A's response was completely ignored:
    // - children is still [mockChildB]
    // - loading is still false
    // - hasFetchedOnce is still true
    // - error is still null
    expect(result.current.children).toEqual([mockChildB]);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.error).toBeNull();
  });

  // 3. Token refresh, იგივე id, ახალი User-object reference:
  //    - hasFetchedOnce რჩება true (არ ვარდება false-ზე)
  //    - Supabase query-ის mock/spy-ის call-count არ იზრდება rerender-ის შემდეგ (ანუ ახალი fetch საერთოდ არ დაწყებულა)
  it('3. Token refresh with same id and new User-object reference: hasFetchedOnce stays true and no new fetch is initiated', async () => {
    const userInstance1 = { id: 'user-a', email: 'parent@example.com' };
    currentAuthUser = userInstance1;

    const { result, rerender } = renderHook(
      ({ user }: { user: { id: string; email?: string } | null }) => {
        currentAuthUser = user;
        return useChildren();
      },
      { initialProps: { user: userInstance1 } }
    );

    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });

    await waitFor(() => {
      expect(result.current.hasFetchedOnce).toBe(true);
      expect(result.current.children).toEqual([mockChildA]);
    });

    const callCountBeforeRefresh = querySpy.mock.calls.length;
    expect(callCountBeforeRefresh).toBe(1);

    // Token refresh: new user object reference with identical id
    const userInstance2 = { id: 'user-a', email: 'parent@example.com' };
    expect(userInstance2).not.toBe(userInstance1);

    rerender({ user: userInstance2 });

    // Observable behavior: hasFetchedOnce stays true, and query spy was not called again
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.children).toEqual([mockChildA]);
    expect(querySpy.mock.calls.length).toBe(callCountBeforeRefresh);
  });

  // 4. A → null (logout): საბოლოო state თავსებადია ChildContext-ის !user-guard-თან
  it('4. A -> null (logout): cleans up children and resets loading, compatible with ChildContext !user guard', async () => {
    currentAuthUser = { id: 'user-a' };
    const { result, rerender } = renderHook(
      ({ user }: { user: { id: string } | null }) => {
        currentAuthUser = user;
        return useChildren();
      },
      { initialProps: { user: currentAuthUser } }
    );

    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });

    await waitFor(() => {
      expect(result.current.children).toEqual([mockChildA]);
      expect(result.current.hasFetchedOnce).toBe(true);
    });

    // User logs out
    rerender({ user: null });

    await waitFor(() => {
      expect(result.current.children).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // 5. !supabase branch: requestIdRef/fetchedForUserId symmetry პირდაპირ დაფარული ერთი targeted ტესტით.
  it('5. !supabase branch: gracefully handles missing supabase client and maintains requestIdRef/fetchedForUserId symmetry', async () => {
    mockSupabaseClient = null;
    currentAuthUser = { id: 'user-a' };

    const { result } = renderHook(() => useChildren());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.hasFetchedOnce).toBe(true);
      expect(result.current.children).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    // No supabase queries should have been attempted
    expect(querySpy).not.toHaveBeenCalled();
  });
});
