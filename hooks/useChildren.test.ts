// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useChildren, UpdateChildGradeResult } from './useChildren';
import { Child, ChildGrade } from '../types';

afterEach(() => {
  cleanup();
});

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

type HookSnapshot = ReturnType<typeof useChildren> & {
  readonly appliedFetchSeq?: number;
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

  // 5. !supabase branch: missing Supabase client for authenticated parent is an error/not-ready condition, never pretend [] success.
  it('5. !supabase branch: treats missing supabase client for authenticated parent as error/not-ready (never pretend [] success)', async () => {
    mockSupabaseClient = null;
    currentAuthUser = { id: 'user-a' };

    const { result } = renderHook(() => useChildren());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.hasFetchedOnce).toBe(false);
      expect(result.current.children).toEqual([]);
      expect(result.current.error).toBeTruthy();
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

describe('G1a-2 - Owner-scoped readiness, first-render isolation, stale-callback & SELECT/INSERT race safety', () => {
  const EXACT_INSERT_VERIFICATION_ERROR =
    'ბავშვის დამატება შესაძლოა შესრულდა, მაგრამ მისი გადამოწმება ვერ მოხერხდა. გთხოვთ, გადაამოწმოთ ბავშვების სია, სანამ ხელახლა სცდით.';

  beforeEach(() => {
    vi.clearAllMocks();
    queryCalls = [];
    currentAuthUser = { id: 'user-a' };
    mockSupabaseClient = createMockSupabase();
  });

  it('G1a-2.1: initial validated [] sets hasFetchedOnce=true, whereas initial Supabase error, rejection, or malformed data leaves hasFetchedOnce=false', async () => {
    // Part A: Initial Supabase error, rejection, and malformed data must NOT set hasFetchedOnce=true
    const { result, unmount } = renderHook(() => useChildren());
    expect(result.current.hasFetchedOnce).toBe(false);
    expect(result.current.loading).toBe(true);

    // 1. Supabase error object
    await act(async () => {
      queryCalls[0].resolve({ data: null, error: { message: 'initial select failed' } });
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.hasFetchedOnce).toBe(false);
    expect(result.current.error).toBe('initial select failed');
    expect(result.current.children).toEqual([]);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(0);

    // 2. Rejected promise
    let fetchPromise!: Promise<void>;
    act(() => {
      fetchPromise = result.current.fetchChildren();
    });
    await act(async () => {
      queryCalls[1].reject(new Error('network down'));
      await fetchPromise;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.hasFetchedOnce).toBe(false);
    expect(result.current.error).toBe('network down');
    expect(result.current.children).toEqual([]);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(0);

    // 3. Malformed row on unready parent
    act(() => {
      fetchPromise = result.current.fetchChildren();
    });
    await act(async () => {
      queryCalls[2].resolve({
        data: [{ ...mockChildA, grade: 99 as unknown as ChildGrade }],
        error: null,
      });
      await fetchPromise;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.hasFetchedOnce).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.children).toEqual([]);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(0);

    // 4. Authoritative empty array [] succeeds and sets hasFetchedOnce=true
    act(() => {
      fetchPromise = result.current.fetchChildren();
    });
    await act(async () => {
      queryCalls[3].resolve({ data: [], error: null });
      await fetchPromise;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.children).toEqual([]);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(1);

    unmount();
  });

  it('G1a-2.2: valid same-parent list followed by failed refetch retains old list and readiness without advancing success event; equal-valued refetch advances success event and clears error', async () => {
    const { result } = renderHook(() => useChildren());

    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });

    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.children).toEqual([mockChildA]);
    expect(result.current.error).toBeNull();
    const seqAfterFirstSuccess = (result.current as HookSnapshot).appliedFetchSeq;
    expect(seqAfterFirstSuccess).toBe(1);

    // Failed refetch (Supabase error)
    let refetchPromise!: Promise<void>;
    act(() => {
      refetchPromise = result.current.fetchChildren();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.children).toEqual([mockChildA]);
    expect(result.current.hasFetchedOnce).toBe(true);

    await act(async () => {
      queryCalls[1].resolve({ data: null, error: { message: 'temporary timeout' } });
      await refetchPromise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.children).toEqual([mockChildA]);
    expect(result.current.error).toBe('temporary timeout');
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(seqAfterFirstSuccess);

    // Retry with equal-valued validated rows advances appliedFetchSeq and clears error
    act(() => {
      refetchPromise = result.current.fetchChildren();
    });
    await act(async () => {
      queryCalls[2].resolve({ data: [{ ...mockChildA }], error: null });
      await refetchPromise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.children).toEqual([mockChildA]);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(2);
  });

  it('G1a-2.3: direct A -> B switch without logout masks A list, error, readiness and loading synchronously on B first render before effects settle', async () => {
    const renderLog: Array<{
      renderUserId: string | null;
      children: Child[];
      loading: boolean;
      error: string | null;
      hasFetchedOnce: boolean;
      appliedFetchSeq?: number;
    }> = [];

    currentAuthUser = { id: 'user-a' };
    const { result, rerender } = renderHook(
      ({ user }: { user: { id: string } | null }) => {
        currentAuthUser = user;
        const state = useChildren() as HookSnapshot;
        renderLog.push({
          renderUserId: user?.id ?? null,
          children: state.children,
          loading: state.loading,
          error: state.error,
          hasFetchedOnce: state.hasFetchedOnce,
          appliedFetchSeq: state.appliedFetchSeq,
        });
        return state;
      },
      { initialProps: { user: currentAuthUser } }
    );

    // Resolve A's initial fetch
    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });

    // Give A a failed refetch so A has cached children=[mockChildA], hasFetchedOnce=true, error='A-err'
    let failRefetch!: Promise<void>;
    act(() => {
      failRefetch = result.current.fetchChildren();
    });
    await act(async () => {
      queryCalls[1].resolve({ data: null, error: { message: 'A-err' } });
      await failRefetch;
    });

    // Also start another A refetch so A has loading=true at the instant of switching to B
    act(() => {
      void result.current.fetchChildren();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.children).toEqual([mockChildA]);
    expect(result.current.hasFetchedOnce).toBe(true);

    const logIndexBeforeSwitch = renderLog.length;

    // Switch directly A -> B without logout intermediate
    rerender({ user: { id: 'user-b' } });

    const bRenders = renderLog.slice(logIndexBeforeSwitch).filter(r => r.renderUserId === 'user-b');
    expect(bRenders.length).toBeGreaterThanOrEqual(1);

    // First synchronous render of B (before B's useEffect runs):
    const firstBRender = bRenders[0];
    expect(firstBRender.children).toEqual([]);
    expect(firstBRender.hasFetchedOnce).toBe(false);
    expect(firstBRender.error).toBeNull();
    expect(firstBRender.loading).toBe(false);
    expect(firstBRender.appliedFetchSeq).toBe(0);

    // After B's effect starts B's query:
    expect(result.current.loading).toBe(true);
    expect(result.current.hasFetchedOnce).toBe(false);
    expect(result.current.children).toEqual([]);
    expect(result.current.error).toBeNull();

    // Resolve B's query
    await act(async () => {
      queryCalls[3].resolve({ data: [mockChildB], error: null });
    });
    expect(result.current.children).toEqual([mockChildB]);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.loading).toBe(false);

    // Late completion of A's in-flight request (queryCalls[2]) is a total no-op on B
    await act(async () => {
      queryCalls[2].resolve({ data: [mockChildA], error: null });
    });
    expect(result.current.children).toEqual([mockChildB]);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('G1a-2.4: stale fetchChildren callback saved from A (or logged-out state) invoked after switching to B does not start an A query or invalidate B pending request', async () => {
    currentAuthUser = { id: 'user-a' };
    const { result, rerender } = renderHook(
      ({ user }: { user: { id: string } | null }) => {
        currentAuthUser = user;
        return useChildren();
      },
      { initialProps: { user: currentAuthUser } }
    );

    const staleFetchFromA = result.current.fetchChildren;
    expect(queryCalls).toHaveLength(1);
    expect(queryCalls[0].parentId).toBe('user-a');

    // Switch to B while A's initial fetch is still pending
    rerender({ user: { id: 'user-b' } });
    expect(queryCalls).toHaveLength(2);
    expect(queryCalls[1].parentId).toBe('user-b');
    expect(result.current.loading).toBe(true);

    // 1. Invoke staleFetchFromA while B's query is pending (normal Supabase client present)
    let stalePromise1!: Promise<void>;
    act(() => {
      stalePromise1 = staleFetchFromA();
    });
    // Clean up any erroneously created query in G1a-1 RED before asserting so act queue never hangs
    if (queryCalls.length > 2) {
      queryCalls[2].resolve({ data: [mockChildA], error: null });
    }
    await act(async () => {
      await stalePromise1;
    });
    // Must not start another query
    expect(queryCalls).toHaveLength(2);
    expect(result.current.loading).toBe(true);

    // 2. Invoke staleFetchFromA when getSupabase() is temporarily null
    const savedClient = mockSupabaseClient;
    mockSupabaseClient = null;
    await act(async () => {
      await staleFetchFromA();
    });
    mockSupabaseClient = savedClient;
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // 3. Reject A's old pending query (queryCalls[0]) — stale catch/finally must not affect B
    await act(async () => {
      queryCalls[0].reject(new Error('stale A error'));
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // 4. Now resolve B's original pending query (queryCalls[1]) — must succeed (proving requestIdRef was NOT bumped by staleFetchFromA)
    await act(async () => {
      queryCalls[1].resolve({ data: [mockChildB], error: null });
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.children).toEqual([mockChildB]);
    expect(result.current.error).toBeNull();

    // 5. Also verify logout sets hasFetchedOnce=false and stale logged-out fetch callback invoked after re-login is a no-op
    rerender({ user: null });
    expect(result.current.hasFetchedOnce).toBe(false);
    expect(result.current.children).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    const staleLoggedOutFetch = result.current.fetchChildren;
    rerender({ user: { id: 'user-b' } });
    expect(queryCalls).toHaveLength(3);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await staleLoggedOutFetch();
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      queryCalls[2].resolve({ data: [mockChildB], error: null });
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.children).toEqual([mockChildB]);
  });

  it('G1a-2.5: addChild guards against pre-INSERT account switch (during ensureProfileExists) and in-flight INSERT account switch while preserving G1a-1 partial-success error precedence', async () => {
    let profileUpsertResolve!: (val: { error: unknown }) => void;
    let insertSingleResolve!: (val: { data: unknown; error: unknown }) => void;
    const insertPayloads: Array<Record<string, unknown>> = [];

    mockSupabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: vi.fn(
              () =>
                new Promise<{ error: unknown }>((res) => {
                  profileUpsertResolve = res;
                })
            ),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_field: string, val: string) => ({
              order: vi.fn(() => {
                let resolveFn!: (v: { data: Child[] | null; error: unknown }) => void;
                let rejectFn!: (e: unknown) => void;
                const promise = new Promise<{ data: Child[] | null; error: unknown }>((res, rej) => {
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
          insert: vi.fn((payload: Record<string, unknown>) => {
            insertPayloads.push(payload);
            const wasSentAfterAccountSwitch = payload.parent_id !== currentAuthUser?.id;
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => {
                  if (wasSentAfterAccountSwitch) {
                    return Promise.resolve({ data: mockChildA, error: null });
                  }
                  return new Promise<{ data: unknown; error: unknown }>((res) => {
                    insertSingleResolve = res;
                  });
                }),
              })),
            };
          }),
        };
      }),
    };

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
    expect(result.current.children).toEqual([mockChildA]);

    // --- Part 1: Switch A -> B while ensureProfileExists is pending (pre-INSERT switch) ---
    let addPromise1!: Promise<{ child: Child | null; error: Error | null }>;
    act(() => {
      addPromise1 = result.current.addChild('ახალი A', 'avatar_1', 'boy', 'pin-1');
    });

    // Switch to B before ensureProfileExists finishes
    rerender({ user: { id: 'user-b' } });
    await act(async () => {
      queryCalls[1].resolve({ data: [mockChildB], error: null });
    });
    expect(result.current.children).toEqual([mockChildB]);

    let res1!: { child: Child | null; error: Error | null };
    await act(async () => {
      profileUpsertResolve({ error: null });
      res1 = await addPromise1;
    });

    // Must NOT have sent an INSERT for A
    expect(insertPayloads).toHaveLength(0);
    expect(res1.child).toBeNull();
    expect(res1.error).toBeInstanceOf(Error);
    expect(result.current.children).toEqual([mockChildB]);

    // --- Part 2: Switch B -> A while B's INSERT is already in flight (valid row returned) ---
    let addPromise2!: Promise<{ child: Child | null; error: Error | null }>;
    act(() => {
      addPromise2 = result.current.addChild('ახალი B', 'avatar_2', 'girl', 'pin-2');
    });

    // Let ensureProfileExists resolve while B is still current so B's INSERT is sent
    await act(async () => {
      profileUpsertResolve({ error: null });
    });
    expect(insertPayloads).toHaveLength(1);
    expect(insertPayloads[0].parent_id).toBe('user-b');

    // Now switch to A while B's INSERT is in flight
    rerender({ user: { id: 'user-a' } });
    await act(async () => {
      queryCalls[2].resolve({ data: [mockChildA], error: null });
    });
    expect(result.current.children).toEqual([mockChildA]);

    let res2!: { child: Child | null; error: Error | null };
    await act(async () => {
      insertSingleResolve({
        data: {
          id: 'child-b-new',
          parent_id: 'user-b',
          name: 'ახალი B',
          avatar_id: 'avatar_2',
          gender: 'girl',
          created_at: '2026-01-04T00:00:00Z',
          grade: null,
        },
        error: null,
      });
      res2 = await addPromise2;
    });

    expect(res2.child).toBeNull();
    expect(res2.error).toBeInstanceOf(Error);
    expect(res2.error?.message).not.toBe(EXACT_INSERT_VERIFICATION_ERROR);
    // Must not append B's child to A's list
    expect(result.current.children).toEqual([mockChildA]);
    // No retry
    expect(insertPayloads).toHaveLength(1);

    // --- Part 3: Switch A -> B while A's INSERT is in flight AND returned row is malformed (grade: 3) ---
    let addPromise3!: Promise<{ child: Child | null; error: Error | null }>;
    act(() => {
      addPromise3 = result.current.addChild('არასწორი A', 'avatar_1', 'boy', 'pin-3');
    });
    await act(async () => {
      profileUpsertResolve({ error: null });
    });
    expect(insertPayloads).toHaveLength(2);

    rerender({ user: { id: 'user-b' } });
    await act(async () => {
      queryCalls[3].resolve({ data: [mockChildB], error: null });
    });

    let res3!: { child: Child | null; error: Error | null };
    await act(async () => {
      insertSingleResolve({
        data: {
          id: 'child-a-bad-return',
          parent_id: 'user-a',
          name: 'არასწორი A',
          avatar_id: 'avatar_1',
          gender: 'boy',
          created_at: '2026-01-05T00:00:00Z',
          grade: 3, // non-null grade is invalid on INSERT return
        },
        error: null,
      });
      res3 = await addPromise3;
    });

    expect(res3.child).toBeNull();
    expect(res3.error?.message).toBe(EXACT_INSERT_VERIFICATION_ERROR);
    expect(result.current.children).toEqual([mockChildB]);
    expect(insertPayloads).toHaveLength(2);
  });

  it('G1a-2.6a: same-account pending SELECT -> validated INSERT -> late old SELECT + successful superseding fetch preserves added child without duplicates and settles loading=false', async () => {
    const insertedChild: Child = {
      id: 'child-a-added',
      parent_id: 'user-a',
      name: 'გიორგი',
      avatar_id: 'avatar_3',
      gender: 'boy',
      created_at: '2026-01-05T00:00:00Z',
      grade: null,
    };

    mockSupabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_field: string, val: string) => ({
              order: vi.fn(() => {
                let resolveFn!: (v: { data: Child[] | null; error: unknown }) => void;
                let rejectFn!: (e: unknown) => void;
                const promise = new Promise<{ data: Child[] | null; error: unknown }>((res, rej) => {
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
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: insertedChild, error: null }),
            })),
          })),
        };
      }),
    };

    const { result } = renderHook(() => useChildren());

    // 1. Resolve initial fetch (#0) with [mockChildA]
    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });
    expect(result.current.children).toEqual([mockChildA]);
    expect(result.current.hasFetchedOnce).toBe(true);

    // 2. Start a refetch SELECT (#1) that stays pending (its DB snapshot predates the upcoming INSERT)
    act(() => {
      void result.current.fetchChildren();
    });
    expect(queryCalls).toHaveLength(2);
    expect(result.current.loading).toBe(true);

    // 3. While SELECT #1 is pending, addChild completes a valid INSERT
    let addRes!: { child: Child | null; error: Error | null };
    await act(async () => {
      addRes = await result.current.addChild('გიორგი', 'avatar_3', 'boy', 'pin-1234');
    });
    expect(addRes.error).toBeNull();
    expect(addRes.child).toEqual(insertedChild);
    expect(result.current.children).toEqual([mockChildA, insertedChild]);

    // 4. Old SELECT #1 resolves late with stale pre-INSERT snapshot [mockChildA]
    await act(async () => {
      queryCalls[1].resolve({ data: [mockChildA], error: null });
    });
    // Must NOT overwrite insertedChild!
    expect(result.current.children).toEqual([mockChildA, insertedChild]);

    // 5. Guarded superseding SELECT (#2) resolves with [mockChildA, insertedChild]
    expect(queryCalls).toHaveLength(3);
    await act(async () => {
      queryCalls[2].resolve({ data: [mockChildA, insertedChild], error: null });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.children).toEqual([mockChildA, insertedChild]);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(2);
  });

  it('G1a-2.6b: same-account initial pending SELECT -> validated INSERT -> late old SELECT + failed superseding fetch settles loading=false, preserves added child, and keeps hasFetchedOnce=false with non-null error', async () => {
    const insertedChild: Child = {
      id: 'child-a-first',
      parent_id: 'user-a',
      name: 'ანა',
      avatar_id: 'avatar_4',
      gender: 'girl',
      created_at: '2026-01-06T00:00:00Z',
      grade: null,
    };

    mockSupabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_field: string, val: string) => ({
              order: vi.fn(() => {
                let resolveFn!: (v: { data: Child[] | null; error: unknown }) => void;
                let rejectFn!: (e: unknown) => void;
                const promise = new Promise<{ data: Child[] | null; error: unknown }>((res, rej) => {
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
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: insertedChild, error: null }),
            })),
          })),
        };
      }),
    };

    const { result } = renderHook(() => useChildren());
    expect(queryCalls).toHaveLength(1);
    expect(result.current.loading).toBe(true);
    expect(result.current.hasFetchedOnce).toBe(false);

    // 1. While initial SELECT #0 is pending, addChild completes a valid INSERT
    let addRes!: { child: Child | null; error: Error | null };
    await act(async () => {
      addRes = await result.current.addChild('ანა', 'avatar_4', 'girl', 'pin-5678');
    });
    expect(addRes.error).toBeNull();
    expect(result.current.children).toEqual([insertedChild]);

    // 2. Old initial SELECT #0 resolves late with stale pre-INSERT empty list []
    await act(async () => {
      queryCalls[0].resolve({ data: [], error: null });
    });
    // Must not overwrite insertedChild or manufacture readiness from stale SELECT #0
    expect(result.current.children).toEqual([insertedChild]);

    // 3. Superseding SELECT #1 fails with a Supabase error
    expect(queryCalls.length).toBeGreaterThanOrEqual(2);
    await act(async () => {
      queryCalls[1].resolve({ data: null, error: { message: 'post-insert select failed' } });
    });

    // Mandatory B3 liveness: loading settles to false, inserted child is preserved, readiness stays false, error reflects failure
    expect(result.current.loading).toBe(false);
    expect(result.current.children).toEqual([insertedChild]);
    expect(result.current.hasFetchedOnce).toBe(false);
    expect(result.current.error).toBe('post-insert select failed');
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(0);
  });
});

describe('G1a-3 - updateChildGrade strict 1-row proof, C2 membership, C1 read-after-write & race safety', () => {
  type DeferredUpdateCall = {
    table: string;
    payload: Record<string, unknown>;
    filters: Array<{ field: string; val: unknown }>;
    selectCols: string;
    resolve: (value: { data: unknown; error: unknown }) => void;
    reject: (reason: unknown) => void;
  };

  let updateCalls: DeferredUpdateCall[] = [];

  const createG1a3SupabaseMock = () => ({
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn((cols: string) => ({
          eq: vi.fn((field: string, val: string) => ({
            order: vi.fn((orderCol: string, opts: unknown) => {
              querySpy(table, field, val, orderCol, opts);
              if (table !== 'children' || field !== 'parent_id' || cols !== 'id, parent_id, name, avatar_id, gender, created_at, grade') {
                return Promise.reject(new Error(`Unexpected SELECT chain: ${table}.${cols}`));
              }
              let resolveFn!: (v: { data: Child[] | null; error: unknown }) => void;
              let rejectFn!: (e: unknown) => void;
              const promise = new Promise<{ data: Child[] | null; error: unknown }>((res, rej) => {
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
        update: vi.fn((payload: Record<string, unknown>) => {
          const filters: Array<{ field: string; val: unknown }> = [];
          const filterBuilder = {
            eq: vi.fn((field: string, val: unknown) => {
              filters.push({ field, val });
              return filterBuilder;
            }),
            select: vi.fn((selectCols: string) => {
              return new Promise<{ data: unknown; error: unknown }>((resolve, reject) => {
                updateCalls.push({
                  table,
                  payload,
                  filters: [...filters],
                  selectCols,
                  resolve,
                  reject,
                });
              });
            }),
          };
          return filterBuilder;
        }),
        insert: vi.fn((payload: Record<string, unknown>) => ({
          select: vi.fn((cols: string) => ({
            single: vi.fn(() => {
              if (cols !== 'id, parent_id, name, avatar_id, gender, created_at, grade') {
                return Promise.reject(new Error(`Unexpected INSERT select cols: ${cols}`));
              }
              return Promise.resolve({
                data: {
                  id: 'child-inserted-g1a3',
                  parent_id: String(payload.parent_id ?? 'user-a'),
                  name: String(payload.name ?? 'ახალი'),
                  avatar_id: String(payload.avatar_id ?? 'avatar_1'),
                  gender: (payload.gender as 'boy' | 'girl') ?? 'boy',
                  created_at: '2026-01-07T00:00:00Z',
                  grade: null,
                },
                error: null,
              });
            }),
          })),
        })),
      };
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryCalls = [];
    updateCalls = [];
    currentAuthUser = { id: 'user-a' };
    mockSupabaseClient = createG1a3SupabaseMock();
  });

  it('G1a-3.A & C & E: exposes updateChildGrade, sends exact .update({ grade }).eq(id).eq(parent_id).select("id") query, does not optimistically mutate before refresh, and returns { ok: true, grade, refreshed: true } across grades 1..6', async () => {
    const { result } = renderHook(() => useChildren());

    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });
    expect(result.current.children).toEqual([mockChildA]);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(1);

    // Explicit method-existence check for genuine Step 0 RED
    expect(typeof result.current.updateChildGrade).toBe('function');

    const gradesToTest: ChildGrade[] = [1, 2, 3, 4, 5, 6];
    let expectedSeq = 1;

    for (const targetGrade of gradesToTest) {
      const prevGrade = result.current.children[0].grade;
      let updatePromise!: Promise<UpdateChildGradeResult>;

      act(() => {
        updatePromise = result.current.updateChildGrade('child-a', targetGrade);
      });

      const call = updateCalls[updateCalls.length - 1];
      expect(call).toBeDefined();
      expect(call.table).toBe('children');
      expect(call.payload).toEqual({ grade: targetGrade });
      expect(call.selectCols).toBe('id');
      expect(call.selectCols).not.toContain('*');
      expect(call.selectCols).not.toContain('pin_hash');
      expect(call.filters).toEqual(
        expect.arrayContaining([
          { field: 'id', val: 'child-a' },
          { field: 'parent_id', val: 'user-a' },
        ])
      );
      expect(call.filters).toHaveLength(2);

      // Resolve the 1-row UPDATE proof; refresh SELECT is now pending
      await act(async () => {
        call.resolve({ data: [{ id: 'child-a' }], error: null });
      });

      // Must NOT optimistically mutate grade before refresh SELECT resolves
      expect(result.current.children[0].grade).toBe(prevGrade);

      const refreshCall = queryCalls[queryCalls.length - 1];
      let outcome!: UpdateChildGradeResult;
      await act(async () => {
        refreshCall.resolve({
          data: [{ ...mockChildA, grade: targetGrade }],
          error: null,
        });
        outcome = await updatePromise;
      });

      expectedSeq += 1;
      expect(outcome).toEqual({
        ok: true,
        grade: targetGrade,
        refreshed: true,
      });
      expect(result.current.children[0].grade).toBe(targetGrade);
      expect((result.current as HookSnapshot).appliedFetchSeq).toBe(expectedSeq);
    }
  });

  it('G1a-3.B: fails closed with { ok: false, error } and 0 network UPDATE calls on unauthenticated user, stale callback after account switch, invalid/blank/foreign/unverified childId, invalid grades, or missing Supabase client', async () => {
    currentAuthUser = { id: 'user-a' };
    const { result, rerender } = renderHook(
      ({ user }: { user: { id: string } | null }) => {
        currentAuthUser = user;
        return useChildren();
      },
      { initialProps: { user: currentAuthUser } }
    );

    expect(typeof result.current.updateChildGrade).toBe('function');

    // 1. Before initial SELECT has validated membership (hasFetchedOnce === false), reject C2 membership check
    let resBeforeReady!: UpdateChildGradeResult;
    await act(async () => {
      resBeforeReady = await result.current.updateChildGrade('child-a', 2);
    });
    expect(resBeforeReady.ok).toBe(false);
    expect(updateCalls).toHaveLength(0);

    // Resolve initial SELECT for User A
    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });
    expect(result.current.hasFetchedOnce).toBe(true);

    // 2. Invalid/blank/foreign childId values
    const invalidChildIds: unknown[] = ['', '   ', 'unknown-child', 'child-b', null, undefined, 123];
    for (const badId of invalidChildIds) {
      let res!: UpdateChildGradeResult;
      await act(async () => {
        res = await result.current.updateChildGrade(badId as string, 3);
      });
      expect(res.ok).toBe(false);
      if ('error' in res) {
        expect(res.error).toBeInstanceOf(Error);
      }
    }
    expect(updateCalls).toHaveLength(0);

    // 3. Invalid grade values (including null, undefined, numeric strings, 0, 7, negative, fractional, NaN, Infinity, boolean, object)
    const invalidGrades: unknown[] = [
      null,
      undefined,
      '1',
      '6',
      0,
      7,
      -1,
      3.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      true,
      false,
      {},
      [1],
    ];
    for (const badGrade of invalidGrades) {
      let res!: UpdateChildGradeResult;
      await act(async () => {
        res = await result.current.updateChildGrade('child-a', badGrade as ChildGrade);
      });
      expect(res.ok).toBe(false);
      if ('error' in res) {
        expect(res.error).toBeInstanceOf(Error);
      }
    }
    expect(updateCalls).toHaveLength(0);

    // 4. Missing Supabase client
    const savedSupabase = mockSupabaseClient;
    mockSupabaseClient = null;
    let resNoSupabase!: UpdateChildGradeResult;
    await act(async () => {
      resNoSupabase = await result.current.updateChildGrade('child-a', 4);
    });
    mockSupabaseClient = savedSupabase;
    expect(resNoSupabase.ok).toBe(false);
    expect(updateCalls).toHaveLength(0);

    // 5. Save stale callback under A, switch to B, invoke stale A callback -> 0 UPDATE calls, B state untouched
    const staleUpdateFromA = result.current.updateChildGrade;
    rerender({ user: { id: 'user-b' } });
    await act(async () => {
      queryCalls[1].resolve({ data: [mockChildB], error: null });
    });

    let resStaleCallback!: UpdateChildGradeResult;
    await act(async () => {
      resStaleCallback = await staleUpdateFromA('child-a', 5);
    });
    expect(resStaleCallback.ok).toBe(false);
    expect(updateCalls).toHaveLength(0);
    expect(result.current.children).toEqual([mockChildB]);

    // 6. Logged out user -> 0 UPDATE calls
    rerender({ user: null });
    let resLoggedOut!: UpdateChildGradeResult;
    await act(async () => {
      resLoggedOut = await result.current.updateChildGrade('child-b', 2);
    });
    expect(resLoggedOut.ok).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it('G1a-3.D: requires strict 1-row matching id proof on UPDATE and rejects [], null, non-array, 2 rows, wrong/empty id, malformed row, Supabase error, or thrown exception with { ok: false, error } and no refresh', async () => {
    const { result } = renderHook(() => useChildren());

    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });
    expect(typeof result.current.updateChildGrade).toBe('function');

    const unconfirmedUpdateResponses: Array<{
      mode: 'resolve' | 'reject';
      value: { data: unknown; error: unknown } | Error;
    }> = [
      { mode: 'resolve', value: { data: [], error: null } },
      { mode: 'resolve', value: { data: null, error: null } },
      { mode: 'resolve', value: { data: { id: 'child-a' }, error: null } },
      { mode: 'resolve', value: { data: [{ id: 'child-a' }, { id: 'child-a' }], error: null } },
      { mode: 'resolve', value: { data: [{ id: 'wrong-child-id' }], error: null } },
      { mode: 'resolve', value: { data: [{ id: '' }], error: null } },
      { mode: 'resolve', value: { data: [null], error: null } },
      { mode: 'resolve', value: { data: [['array-row']], error: null } },
      { mode: 'resolve', value: { data: [{}], error: null } },
      { mode: 'resolve', value: { data: null, error: { message: 'update blocked by policy' } } },
      { mode: 'reject', value: new Error('network transport failure') },
    ];

    const selectCountBefore = queryCalls.length;

    for (let i = 0; i < unconfirmedUpdateResponses.length; i++) {
      const testCase = unconfirmedUpdateResponses[i];
      let promise!: Promise<UpdateChildGradeResult>;
      act(() => {
        promise = result.current.updateChildGrade('child-a', 4);
      });

      expect(updateCalls).toHaveLength(i + 1);
      const currentUpdateCall = updateCalls[i];

      let res!: UpdateChildGradeResult;
      await act(async () => {
        if (testCase.mode === 'resolve') {
          currentUpdateCall.resolve(testCase.value as { data: unknown; error: unknown });
        } else {
          currentUpdateCall.reject(testCase.value);
        }
        res = await promise;
      });

      expect(res.ok).toBe(false);
      if ('error' in res) {
        expect(res.error).toBeInstanceOf(Error);
        expect(res.error.message.length).toBeGreaterThan(0);
      }
      // Must NOT trigger any post-write refresh SELECT or mutate children
      expect(queryCalls).toHaveLength(selectCountBefore);
      expect(result.current.children).toEqual([mockChildA]);
      expect(result.current.children[0].grade).toBeNull();
    }
  });

  it('G1a-3.F: returns { ok: true, grade, refreshed: false } when 1-row write is confirmed but read-after-write SELECT fails, rejects, returns null/malformed data, or client is missing, preserving prior verified state and readiness', async () => {
    const { result } = renderHook(() => useChildren());

    await act(async () => {
      queryCalls[0].resolve({ data: [{ ...mockChildA, grade: 2 }], error: null });
    });
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.children[0].grade).toBe(2);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(1);
    expect(typeof result.current.updateChildGrade).toBe('function');

    // 1. Refresh SELECT returns Supabase error
    let p1!: Promise<UpdateChildGradeResult>;
    act(() => {
      p1 = result.current.updateChildGrade('child-a', 5);
    });
    await act(async () => {
      updateCalls[0].resolve({ data: [{ id: 'child-a' }], error: null });
    });
    let r1!: UpdateChildGradeResult;
    await act(async () => {
      queryCalls[1].resolve({ data: null, error: { message: 'refresh select failed' } });
      r1 = await p1;
    });
    expect(r1).toEqual({ ok: true, grade: 5, refreshed: false });
    expect(result.current.children[0].grade).toBe(2);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('refresh select failed');
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(1);
    expect(updateCalls).toHaveLength(1);

    // 2. Refresh SELECT rejects
    let p2!: Promise<UpdateChildGradeResult>;
    act(() => {
      p2 = result.current.updateChildGrade('child-a', 6);
    });
    await act(async () => {
      updateCalls[1].resolve({ data: [{ id: 'child-a' }], error: null });
    });
    let r2!: UpdateChildGradeResult;
    await act(async () => {
      queryCalls[2].reject(new Error('refresh network rejected'));
      r2 = await p2;
    });
    expect(r2).toEqual({ ok: true, grade: 6, refreshed: false });
    expect(result.current.children[0].grade).toBe(2);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('refresh network rejected');
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(1);

    // 3. Refresh SELECT returns malformed grade row
    let p3!: Promise<UpdateChildGradeResult>;
    act(() => {
      p3 = result.current.updateChildGrade('child-a', 3);
    });
    await act(async () => {
      updateCalls[2].resolve({ data: [{ id: 'child-a' }], error: null });
    });
    let r3!: UpdateChildGradeResult;
    await act(async () => {
      queryCalls[3].resolve({
        data: [{ ...mockChildA, grade: 99 as unknown as ChildGrade }],
        error: null,
      });
      r3 = await p3;
    });
    expect(r3).toEqual({ ok: true, grade: 3, refreshed: false });
    expect(result.current.children[0].grade).toBe(2);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(1);

    // 4. Refresh SELECT returns data: null, error: null
    let p4!: Promise<UpdateChildGradeResult>;
    act(() => {
      p4 = result.current.updateChildGrade('child-a', 4);
    });
    await act(async () => {
      updateCalls[3].resolve({ data: [{ id: 'child-a' }], error: null });
    });
    let r4!: UpdateChildGradeResult;
    await act(async () => {
      queryCalls[4].resolve({ data: null, error: null });
      r4 = await p4;
    });
    expect(r4).toEqual({ ok: true, grade: 4, refreshed: false });
    expect(result.current.children[0].grade).toBe(2);
    expect(result.current.hasFetchedOnce).toBe(true);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(1);
    expect(updateCalls).toHaveLength(4);
  });

  it('G1a-3.G: returns { ok: true, grade, refreshed: false } when post-write validated SELECT has mismatched grade or omits the target child, keeping the authoritative SELECT list untouched', async () => {
    const secondChildA: Child = {
      id: 'child-a-2',
      parent_id: 'user-a',
      name: 'ელენე',
      avatar_id: 'avatar_2',
      gender: 'girl',
      created_at: '2026-01-02T00:00:00Z',
      grade: 1,
    };

    const { result } = renderHook(() => useChildren());

    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA, secondChildA], error: null });
    });
    expect(typeof result.current.updateChildGrade).toBe('function');

    // Case 1: Refresh succeeds with valid list, but child-a has grade 2 instead of requested grade 5
    let pMismatch!: Promise<UpdateChildGradeResult>;
    act(() => {
      pMismatch = result.current.updateChildGrade('child-a', 5);
    });
    await act(async () => {
      updateCalls[0].resolve({ data: [{ id: 'child-a' }], error: null });
    });
    let resMismatch!: UpdateChildGradeResult;
    await act(async () => {
      queryCalls[1].resolve({
        data: [{ ...mockChildA, grade: 2 }, secondChildA],
        error: null,
      });
      resMismatch = await pMismatch;
    });

    expect(resMismatch).toEqual({ ok: true, grade: 5, refreshed: false });
    // Authoritative SELECT list must remain grade 2 (never overwritten with 5)
    expect(result.current.children).toEqual([{ ...mockChildA, grade: 2 }, secondChildA]);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(2);

    // Case 2: Refresh succeeds with valid list omitting child-a
    let pMissing!: Promise<UpdateChildGradeResult>;
    act(() => {
      pMissing = result.current.updateChildGrade('child-a', 6);
    });
    await act(async () => {
      updateCalls[1].resolve({ data: [{ id: 'child-a' }], error: null });
    });
    let resMissing!: UpdateChildGradeResult;
    await act(async () => {
      queryCalls[2].resolve({
        data: [secondChildA],
        error: null,
      });
      resMissing = await pMissing;
    });

    expect(resMissing).toEqual({ ok: true, grade: 6, refreshed: false });
    expect(result.current.children).toEqual([secondChildA]);
    expect((result.current as HookSnapshot).appliedFetchSeq).toBe(3);
  });

  it('G1a-3.H: handles A -> B switch during in-flight UPDATE or during post-write refresh without leaking A into B or starting an A refresh under B', async () => {
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
    expect(typeof result.current.updateChildGrade).toBe('function');

    // Part 1: Start A's UPDATE, then switch A -> B while UPDATE is in flight
    let pInFlightUpdate!: Promise<UpdateChildGradeResult>;
    act(() => {
      pInFlightUpdate = result.current.updateChildGrade('child-a', 3);
    });
    expect(updateCalls).toHaveLength(1);

    rerender({ user: { id: 'user-b' } });
    // First render of B is masked
    expect(result.current.children).toEqual([]);
    expect(result.current.hasFetchedOnce).toBe(false);
    expect(queryCalls).toHaveLength(2);
    expect(queryCalls[1].parentId).toBe('user-b');

    // Resolve A's in-flight UPDATE while B is current -> must return refreshed:false and NOT start an A refresh SELECT
    let resInFlightUpdate!: UpdateChildGradeResult;
    await act(async () => {
      updateCalls[0].resolve({ data: [{ id: 'child-a' }], error: null });
      resInFlightUpdate = await pInFlightUpdate;
    });
    expect(resInFlightUpdate).toEqual({ ok: true, grade: 3, refreshed: false });
    expect(queryCalls).toHaveLength(2);

    // Resolve B's initial SELECT
    await act(async () => {
      queryCalls[1].resolve({ data: [mockChildB], error: null });
    });
    expect(result.current.children).toEqual([mockChildB]);

    // Part 2: Start B's UPDATE, confirm B's UPDATE so B's post-write refresh SELECT starts, then switch B -> A while B's refresh is in flight
    let pInFlightRefresh!: Promise<UpdateChildGradeResult>;
    act(() => {
      pInFlightRefresh = result.current.updateChildGrade('child-b', 4);
    });
    expect(updateCalls).toHaveLength(2);

    await act(async () => {
      updateCalls[1].resolve({ data: [{ id: 'child-b' }], error: null });
    });
    // queryCalls[2] is B's post-write refresh SELECT
    expect(queryCalls).toHaveLength(3);
    expect(queryCalls[2].parentId).toBe('user-b');

    // Switch B -> A while B's refresh SELECT is pending
    rerender({ user: { id: 'user-a' } });
    expect(result.current.children).toEqual([]);
    expect(queryCalls).toHaveLength(4);
    expect(queryCalls[3].parentId).toBe('user-a');

    // Resolve A's SELECT first
    await act(async () => {
      queryCalls[3].resolve({ data: [mockChildA], error: null });
    });
    expect(result.current.children).toEqual([mockChildA]);

    // Now resolve B's stale post-write refresh SELECT late
    let resInFlightRefresh!: UpdateChildGradeResult;
    await act(async () => {
      queryCalls[2].resolve({ data: [{ ...mockChildB, grade: 4 }], error: null });
      resInFlightRefresh = await pInFlightRefresh;
    });
    expect(resInFlightRefresh).toEqual({ ok: true, grade: 4, refreshed: false });
    expect(result.current.children).toEqual([mockChildA]);
  });

  it('G1a-3.I: overlapping grade updates, superseding SELECTs, and concurrent addChild INSERT preserve request-generation ordering, never return false refreshed:true for superseded refresh, and settle loading=false (B3 liveness)', async () => {
    const { result } = renderHook(() => useChildren());

    await act(async () => {
      queryCalls[0].resolve({ data: [mockChildA], error: null });
    });
    expect(typeof result.current.updateChildGrade).toBe('function');

    // --- Part 1: Overlapping updateChildGrade #1 (grade 2) superseded by updateChildGrade #2 (grade 6) ---
    let pUpdate1!: Promise<UpdateChildGradeResult>;
    let pUpdate2!: Promise<UpdateChildGradeResult>;

    act(() => {
      pUpdate1 = result.current.updateChildGrade('child-a', 2);
    });
    await act(async () => {
      updateCalls[0].resolve({ data: [{ id: 'child-a' }], error: null });
    });
    // queryCalls[1] is Update #1's refresh SELECT
    expect(queryCalls).toHaveLength(2);

    // Start Update #2 while Update #1's refresh SELECT is still pending
    act(() => {
      pUpdate2 = result.current.updateChildGrade('child-a', 6);
    });
    await act(async () => {
      updateCalls[1].resolve({ data: [{ id: 'child-a' }], error: null });
    });
    // queryCalls[2] is Update #2's refresh SELECT (supersedes queryCalls[1])
    expect(queryCalls).toHaveLength(3);

    // Resolve superseded queryCalls[1] with grade 2 -> Update #1 must report refreshed: false and NOT overwrite state
    let resUpdate1!: UpdateChildGradeResult;
    await act(async () => {
      queryCalls[1].resolve({ data: [{ ...mockChildA, grade: 2 }], error: null });
      resUpdate1 = await pUpdate1;
    });
    expect(resUpdate1).toEqual({ ok: true, grade: 2, refreshed: false });
    expect(result.current.loading).toBe(true);

    // Resolve current queryCalls[2] with grade 6 -> Update #2 reports refreshed: true and loading settles to false
    let resUpdate2!: UpdateChildGradeResult;
    await act(async () => {
      queryCalls[2].resolve({ data: [{ ...mockChildA, grade: 6 }], error: null });
      resUpdate2 = await pUpdate2;
    });
    expect(resUpdate2).toEqual({ ok: true, grade: 6, refreshed: true });
    expect(result.current.children).toEqual([{ ...mockChildA, grade: 6 }]);
    expect(result.current.loading).toBe(false);

    // --- Part 2: updateChildGrade refresh SELECT in flight when addChild INSERT completes ---
    let pUpdate3!: Promise<UpdateChildGradeResult>;
    act(() => {
      pUpdate3 = result.current.updateChildGrade('child-a', 4);
    });
    await act(async () => {
      updateCalls[2].resolve({ data: [{ id: 'child-a' }], error: null });
    });
    // queryCalls[3] is Update #3's in-flight refresh SELECT
    expect(queryCalls).toHaveLength(4);

    // While queryCalls[3] is pending, addChild completes a valid INSERT -> triggers superseding queryCalls[4]
    let addRes!: { child: Child | null; error: Error | null };
    await act(async () => {
      addRes = await result.current.addChild('ახალი', 'avatar_1', 'boy', 'pin-999');
    });
    expect(addRes.error).toBeNull();
    expect(queryCalls).toHaveLength(5);

    // Stale queryCalls[3] resolves late without the inserted child -> Update #3 gets refreshed: false, inserted child is preserved
    let resUpdate3!: UpdateChildGradeResult;
    await act(async () => {
      queryCalls[3].resolve({ data: [{ ...mockChildA, grade: 4 }], error: null });
      resUpdate3 = await pUpdate3;
    });
    expect(resUpdate3).toEqual({ ok: true, grade: 4, refreshed: false });
    expect(result.current.children.some((c) => c.id === 'child-inserted-g1a3')).toBe(true);

    // Superseding post-INSERT queryCalls[4] resolves with both children -> loading settles to false, no duplicates
    await act(async () => {
      queryCalls[4].resolve({
        data: [
          { ...mockChildA, grade: 4 },
          addRes.child!,
        ],
        error: null,
      });
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.children).toEqual([
      { ...mockChildA, grade: 4 },
      addRes.child!,
    ]);
  });
});
