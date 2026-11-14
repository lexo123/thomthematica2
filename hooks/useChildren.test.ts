// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChildren } from './useChildren';
import { Child, ChildGrade } from '../types';

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
  grade: null,
};

const mockChildB: Child = {
  id: 'child-b',
  parent_id: 'user-b',
  name: 'ნიტა',
  avatar_id: 'avatar_2',
  gender: 'girl',
  created_at: '2026-01-02T00:00:00Z',
  grade: null,
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

  it('FIX 1 & FIX 3: fetchChildren requests explicit columns without pin_hash and addChild includes pin_hash', async () => {
    let capturedSelectCols = '';
    let capturedInsertPayload: any = null;
    let capturedInsertSelectCols = '';

    mockSupabaseClient = {
      from: vi.fn((table: string) => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn((cols: string) => {
          capturedSelectCols = cols;
          return {
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [mockChildA], error: null }),
            })),
          };
        }),
        insert: vi.fn((payload: any) => {
          capturedInsertPayload = payload;
          return {
            select: vi.fn((cols: string) => {
              capturedInsertSelectCols = cols;
              return {
                single: vi.fn().mockResolvedValue({
                  data: { ...mockChildA, name: payload.name },
                  error: null,
                }),
              };
            }),
          };
        }),
      })),
    };

    currentAuthUser = { id: 'user-a' };
    const { result } = renderHook(() => useChildren());

    await waitFor(() => {
      expect(result.current.hasFetchedOnce).toBe(true);
    });

    // FIX 3: select must use explicit columns and NOT select '*' or pin_hash
    expect(capturedSelectCols).toBe('id, parent_id, name, avatar_id, gender, created_at, grade');
    expect(capturedSelectCols).not.toContain('pin_hash');

    // FIX 1: addChild passes pin_hash in insert payload and selects explicit columns
    let addRes: any;
    await act(async () => {
      addRes = await result.current.addChild('თომა', 'avatar_1', 'boy', 'test-hashed-pin');
    });

    expect(addRes.error).toBeNull();
    expect(capturedInsertPayload.pin_hash).toBe('test-hashed-pin');
    expect(capturedInsertSelectCols).toBe('id, parent_id, name, avatar_id, gender, created_at, grade');
    expect(capturedInsertSelectCols).not.toContain('pin_hash');
  });
});

describe('G1a-1 - ChildGrade domain, projection, strict SELECT & INSERT validation', () => {
  const EXACT_INSERT_VERIFICATION_ERROR =
    'ბავშვის დამატება შესაძლოა შესრულდა, მაგრამ მისი გადამოწმება ვერ მოხერხდა. გთხოვთ, გადაამოწმოთ ბავშვების სია, სანამ ხელახლა სცდით.';

  beforeEach(() => {
    vi.clearAllMocks();
    queryCalls = [];
    currentAuthUser = { id: 'user-a' };
  });

  const setupMockChains = (options: {
    selectQueue?: Array<{ data: unknown; error: unknown }>;
    insertSingleResult?: { data: unknown; error: unknown };
  }) => {
    const selectProjections: string[] = [];
    const insertSelectProjections: string[] = [];
    const insertPayloads: Array<Record<string, unknown>> = [];
    const queue = [...(options.selectQueue ?? [{ data: [mockChildA], error: null }])];

    mockSupabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-a' }, error: null }),
              })),
            })),
          };
        }
        return {
          select: vi.fn((cols: string) => {
            selectProjections.push(cols);
            return {
              eq: vi.fn((field: string, val: string) => ({
                order: vi.fn(() => {
                  expect(field).toBe('parent_id');
                  expect(val).toBe(currentAuthUser?.id);
                  const next = queue.shift() ?? { data: [], error: null };
                  return Promise.resolve(next);
                }),
              })),
            };
          }),
          insert: vi.fn((payload: Record<string, unknown>) => {
            insertPayloads.push(payload);
            return {
              select: vi.fn((cols: string) => {
                insertSelectProjections.push(cols);
                return {
                  single: vi.fn().mockResolvedValue(
                    options.insertSingleResult ?? {
                      data: {
                        id: 'child-inserted',
                        parent_id: 'user-a',
                        name: String(payload.name ?? 'თომა'),
                        avatar_id: String(payload.avatar_id ?? 'avatar_1'),
                        gender: 'boy',
                        created_at: '2026-01-03T00:00:00Z',
                        grade: null,
                      },
                      error: null,
                    }
                  ),
                };
              }),
            };
          }),
        };
      }),
    };

    return { selectProjections, insertSelectProjections, insertPayloads };
  };

  it('uses exact CHILD_COLUMNS for both SELECT and INSERT-return without * or pin_hash, and preserves 4-argument addChild payload without grade', async () => {
    const { selectProjections, insertSelectProjections, insertPayloads } = setupMockChains({});

    const { result } = renderHook(() => useChildren());
    await waitFor(() => {
      expect(result.current.hasFetchedOnce).toBe(true);
    });

    expect(selectProjections).toEqual(['id, parent_id, name, avatar_id, gender, created_at, grade']);
    expect(selectProjections[0]).not.toContain('*');
    expect(selectProjections[0]).not.toContain('pin_hash');

    let addResult!: { child: Child | null; error: Error | null };
    await act(async () => {
      addResult = await result.current.addChild('  ლუკა  ', 'avatar_2', 'boy', 'hashed-pin-9999');
    });

    expect(addResult.error).toBeNull();
    expect(addResult.child).toEqual({
      id: 'child-inserted',
      parent_id: 'user-a',
      name: 'ლუკა',
      avatar_id: 'avatar_2',
      gender: 'boy',
      created_at: '2026-01-03T00:00:00Z',
      grade: null,
    });

    expect(insertSelectProjections).toEqual(['id, parent_id, name, avatar_id, gender, created_at, grade']);
    expect(insertSelectProjections[0]).not.toContain('*');
    expect(insertSelectProjections[0]).not.toContain('pin_hash');

    expect(insertPayloads).toHaveLength(1);
    expect(Object.keys(insertPayloads[0]).sort()).toEqual(
      ['avatar_id', 'gender', 'name', 'parent_id', 'pin_hash'].sort()
    );
    expect(Object.prototype.hasOwnProperty.call(insertPayloads[0], 'grade')).toBe(false);
    expect(insertPayloads[0]).toEqual({
      parent_id: 'user-a',
      name: 'ლუკა',
      avatar_id: 'avatar_2',
      gender: 'boy',
      pin_hash: 'hashed-pin-9999',
    });
  });

  it('accepts valid multi-row array with grade: null and each numeric ChildGrade 1..6', async () => {
    const validGrades: Array<ChildGrade | null> = [null, 1, 2, 3, 4, 5, 6];
    const validRows: Child[] = validGrades.map((grade, idx) => ({
      id: `child-grade-${idx}`,
      parent_id: 'user-a',
      name: `ბავშვი ${idx}`,
      avatar_id: 'avatar_1',
      gender: idx % 2 === 0 ? 'boy' : 'girl',
      created_at: '2026-01-01T00:00:00Z',
      grade,
    }));

    setupMockChains({
      selectQueue: [{ data: validRows, error: null }],
    });

    const { result } = renderHook(() => useChildren());
    await waitFor(() => {
      expect(result.current.hasFetchedOnce).toBe(true);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.children).toEqual(validRows);
  });

  it('rejects malformed grade values (missing, undefined, string "1", 0, 7, fractional, NaN, Infinity, non-own property, wrong type) without coercion', async () => {
    const inheritedGradeRow = Object.assign(Object.create({ grade: 1 }), {
      id: 'child-inherited',
      parent_id: 'user-a',
      name: 'თომა',
      avatar_id: 'avatar_1',
      gender: 'boy',
      created_at: '2026-01-01T00:00:00Z',
    });

    const { grade: _omitted, ...missingGradeRow } = mockChildA;

    const invalidGradeRows: unknown[] = [
      missingGradeRow,
      { ...mockChildA, grade: undefined },
      { ...mockChildA, grade: '1' },
      { ...mockChildA, grade: 0 },
      { ...mockChildA, grade: 7 },
      { ...mockChildA, grade: -1 },
      { ...mockChildA, grade: 2.5 },
      { ...mockChildA, grade: Number.NaN },
      { ...mockChildA, grade: Number.POSITIVE_INFINITY },
      { ...mockChildA, grade: Number.NEGATIVE_INFINITY },
      { ...mockChildA, grade: true },
      { ...mockChildA, grade: {} },
      inheritedGradeRow,
    ];

    setupMockChains({
      selectQueue: invalidGradeRows.map((badRow) => ({ data: [badRow], error: null })),
    });

    const { result } = renderHook(() => useChildren());

    for (let i = 0; i < invalidGradeRows.length; i++) {
      if (i > 0) {
        await act(async () => {
          await result.current.fetchChildren();
        });
      }
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.error).toBeTruthy();
      expect(result.current.children).toEqual([]);
    }
  });

  it('rejects row shape failures: null row, array row, wrong parent_id, malformed gender, non-string fields, missing/empty id, and duplicate id', async () => {
    const invalidRowPayloads: unknown[][] = [
      [null],
      [['array-instead-of-object']],
      [{ ...mockChildA, parent_id: 'other-user' }],
      [{ ...mockChildA, parent_id: null }],
      [{ ...mockChildA, gender: 'other' }],
      [{ ...mockChildA, gender: '' }],
      [{ ...mockChildA, name: 123 }],
      [{ ...mockChildA, avatar_id: null }],
      [{ ...mockChildA, created_at: undefined }],
      [{ ...mockChildA, id: '' }],
      [{ ...mockChildA, id: 42 }],
      [
        mockChildA,
        { ...mockChildA, name: 'დუბლიკატი ID' },
      ],
    ];

    setupMockChains({
      selectQueue: invalidRowPayloads.map((rows) => ({ data: rows, error: null })),
    });

    const { result } = renderHook(() => useChildren());

    for (let i = 0; i < invalidRowPayloads.length; i++) {
      if (i > 0) {
        await act(async () => {
          await result.current.fetchChildren();
        });
      }
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.error).toBeTruthy();
      expect(result.current.children).toEqual([]);
    }
  });

  it('does not publish partial array on mixed valid/invalid response and preserves previously validated child array', async () => {
    const secondValidChild: Child = {
      id: 'child-a-2',
      parent_id: 'user-a',
      name: 'ელენე',
      avatar_id: 'avatar_3',
      gender: 'girl',
      created_at: '2026-01-02T00:00:00Z',
      grade: 3,
    };
    const invalidChild = {
      ...mockChildA,
      id: 'child-a-bad',
      grade: 9,
    };

    setupMockChains({
      selectQueue: [
        { data: [mockChildA], error: null },
        { data: [secondValidChild, invalidChild], error: null },
      ],
    });

    const { result } = renderHook(() => useChildren());
    await waitFor(() => {
      expect(result.current.children).toEqual([mockChildA]);
      expect(result.current.error).toBeNull();
    });

    await act(async () => {
      await result.current.fetchChildren();
    });

    expect(result.current.error).toBeTruthy();
    // Must keep prior [mockChildA], neither publishing [secondValidChild] nor clobbering to []
    expect(result.current.children).toEqual([mockChildA]);
  });

  it('rejects data: null with error: null (and non-array data) while accepting a real empty array []', async () => {
    setupMockChains({
      selectQueue: [
        { data: [mockChildA], error: null },
        { data: null, error: null },
        { data: { id: 'not-an-array' }, error: null },
        { data: [], error: null },
      ],
    });

    const { result } = renderHook(() => useChildren());
    await waitFor(() => {
      expect(result.current.children).toEqual([mockChildA]);
      expect(result.current.error).toBeNull();
    });

    // 1. data: null, error: null -> error, does not clobber [mockChildA]
    await act(async () => {
      await result.current.fetchChildren();
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.children).toEqual([mockChildA]);

    // 2. data: object instead of array, error: null -> error, does not clobber [mockChildA]
    await act(async () => {
      await result.current.fetchChildren();
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.children).toEqual([mockChildA]);

    // 3. data: [], error: null -> authoritative empty list
    await act(async () => {
      await result.current.fetchChildren();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.children).toEqual([]);
  });

  it('fails INSERT verification with exact Georgian error message when returned row has non-null grade, missing/invalid grade, wrong parent_id, or null data, without appending or retrying', async () => {
    const invalidInsertReturns: unknown[] = [
      null,
      { ...mockChildA, id: 'new-1', grade: 1 }, // non-null grade is invalid for new-child INSERT
      { ...mockChildA, id: 'new-2', grade: 6 },
      { ...mockChildA, id: 'new-3', grade: undefined },
      { ...mockChildA, id: 'new-4', grade: '1' },
      { ...mockChildA, id: 'new-5', parent_id: 'other-parent', grade: null },
      { ...mockChildA, id: '', grade: null },
    ];

    for (const badReturnData of invalidInsertReturns) {
      const { insertPayloads } = setupMockChains({
        selectQueue: [{ data: [mockChildA], error: null }],
        insertSingleResult: { data: badReturnData, error: null },
      });

      const { result, unmount } = renderHook(() => useChildren());
      await waitFor(() => {
        expect(result.current.children).toEqual([mockChildA]);
      });

      let addRes!: { child: Child | null; error: Error | null };
      await act(async () => {
        addRes = await result.current.addChild('ახალი', 'avatar_1', 'boy', 'pin-hash-1');
      });

      expect(addRes.child).toBeNull();
      expect(addRes.error).not.toBeNull();
      expect(addRes.error?.message).toBe(EXACT_INSERT_VERIFICATION_ERROR);
      expect(result.current.children).toEqual([mockChildA]);
      expect(insertPayloads).toHaveLength(1);
      unmount();
    }
  });

  it('keeps explicit Supabase INSERT error separate from response-validation failure', async () => {
    const { insertPayloads } = setupMockChains({
      selectQueue: [{ data: [mockChildA], error: null }],
      insertSingleResult: {
        data: null,
        error: { message: 'duplicate key value violates unique constraint' },
      },
    });

    const { result } = renderHook(() => useChildren());
    await waitFor(() => {
      expect(result.current.children).toEqual([mockChildA]);
    });

    let addRes!: { child: Child | null; error: Error | null };
    await act(async () => {
      addRes = await result.current.addChild('ახალი', 'avatar_1', 'boy', 'pin-hash-1');
    });

    expect(addRes.child).toBeNull();
    expect(addRes.error).not.toBeNull();
    expect(addRes.error?.message).toBe('duplicate key value violates unique constraint');
    expect(addRes.error?.message).not.toBe(EXACT_INSERT_VERIFICATION_ERROR);
    expect(result.current.children).toEqual([mockChildA]);
    expect(insertPayloads).toHaveLength(1);
  });
});
