// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { ChildProvider, useChild } from './ChildContext';
import { UpdateChildGradeResult } from '../hooks/useChildren';
import { Child, ChildGrade, ChildRewardImagesState } from '../types';

/**
 * Layer documentation per G1a-2 §7B & G1a-3 §6/§7:
 * - REAL in ALL tests in this file:
 *   - `ChildProvider` and `useChild` (`./ChildContext`)
 *   - `useChildren` (`../hooks/useChildren`)
 *   - `useChildRewardImagesFetcher` (`../hooks/useChildRewardImagesFetcher`)
 * - MOCKED boundary dependencies only:
 *   - `useAuth` (`./AuthContext`) with mutable parent identity
 *   - `getSupabase` (`../lib/supabase`) with controlled deferred SELECT and UPDATE responses
 *   - `fetchChildRewardImages` (`../services/rewardImagesService`) with controlled deferred / immediate promises and shared EMPTY_STATE singleton
 */

let currentAuthUser: { id: string; email?: string } | null = null;
let mockSupabaseClient: unknown = null;

type DeferredSelectCall = {
  parentId: string;
  resolve: (value: { data: Child[] | null; error: unknown }) => void;
  reject: (reason: unknown) => void;
};
let selectCalls: DeferredSelectCall[] = [];

type DeferredUpdateCall = {
  table: string;
  payload: Record<string, unknown>;
  filters: Array<{ field: string; val: unknown }>;
  selectCols: string;
  resolve: (value: { data: unknown; error: unknown }) => void;
  reject: (reason: unknown) => void;
};
let updateCalls: DeferredUpdateCall[] = [];

type DeferredRewardCall = {
  childId: string;
  resolve: (value: ChildRewardImagesState) => void;
  reject: (reason: unknown) => void;
};
let rewardCalls: DeferredRewardCall[] = [];
let rewardImmediateResolver: ((childId: string) => Promise<ChildRewardImagesState> | null) | null = null;

export const SHARED_EMPTY_REWARD_STATE: ChildRewardImagesState = {
  isPersonalized: false,
  winner: [],
  loser: [],
  super_winner: [],
};

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: currentAuthUser,
  }),
}));

vi.mock('../lib/supabase', () => ({
  getSupabase: () => mockSupabaseClient,
}));

const rewardServiceSpy = vi.fn((childId: string): Promise<ChildRewardImagesState> => {
  if (rewardImmediateResolver) {
    const immediate = rewardImmediateResolver(childId);
    if (immediate) {
      return immediate;
    }
  }
  return new Promise<ChildRewardImagesState>((resolve, reject) => {
    rewardCalls.push({ childId, resolve, reject });
  });
});

vi.mock('../services/rewardImagesService', () => ({
  fetchChildRewardImages: (childId: string) => rewardServiceSpy(childId),
}));

const createDeferredSupabaseMock = () => ({
  from: vi.fn((table: string) => ({
    select: vi.fn((_cols: string) => ({
      eq: vi.fn((_field: string, val: string) => ({
        order: vi.fn(() => {
          return new Promise<{ data: Child[] | null; error: unknown }>((resolve, reject) => {
            selectCalls.push({ parentId: val, resolve, reject });
          });
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
  })),
});

const childA1: Child = {
  id: 'child-a-1',
  parent_id: 'user-a',
  name: 'თომა',
  avatar_id: 'avatar_1',
  gender: 'boy',
  created_at: '2026-01-01T00:00:00Z',
  grade: null,
};

const childA2: Child = {
  id: 'child-a-2',
  parent_id: 'user-a',
  name: 'ელენე',
  avatar_id: 'avatar_3',
  gender: 'girl',
  created_at: '2026-01-02T00:00:00Z',
  grade: 3,
};

const childB1: Child = {
  id: 'child-b-1',
  parent_id: 'user-b',
  name: 'ნიტა',
  avatar_id: 'avatar_2',
  gender: 'girl',
  created_at: '2026-01-03T00:00:00Z',
  grade: 5,
};

const personalizedA1: ChildRewardImagesState = {
  isPersonalized: true,
  winner: [{ url: 'https://example.test/a1-win.png', caption: 'A1 Win' }],
  loser: [{ url: 'https://example.test/a1-lose.png', caption: 'A1 Lose' }],
  super_winner: [{ url: 'https://example.test/a1-super.png', caption: 'A1 Super' }],
};

const personalizedA1Updated: ChildRewardImagesState = {
  isPersonalized: true,
  winner: [{ url: 'https://example.test/a1-win-v2.png', caption: 'A1 Win v2' }],
  loser: [{ url: 'https://example.test/a1-lose-v2.png', caption: 'A1 Lose v2' }],
  super_winner: [{ url: 'https://example.test/a1-super-v2.png', caption: 'A1 Super v2' }],
};

const personalizedA2: ChildRewardImagesState = {
  isPersonalized: true,
  winner: [{ url: 'https://example.test/a2-win.png', caption: 'A2 Win' }],
  loser: [{ url: 'https://example.test/a2-lose.png', caption: 'A2 Lose' }],
  super_winner: [{ url: 'https://example.test/a2-super.png', caption: 'A2 Super' }],
};

interface ObservedContextRender {
  authUserId: string | null;
  childrenIds: string[];
  activeChildId: string | null;
  activeChildName: string | null;
  activeChildGrade: ChildGrade | null | undefined;
  childRewardImages: ChildRewardImagesState | null;
  loading: boolean;
  error: string | null;
  hasFetchedOnce: boolean;
}

const ContextConsumerProbe: React.FC<{
  onRenderSnapshot?: (snapshot: ObservedContextRender) => void;
  candidateToSelect?: string | null;
}> = ({ onRenderSnapshot, candidateToSelect = 'child-b-1' }) => {
  const ctx = useChild();

  onRenderSnapshot?.({
    authUserId: currentAuthUser?.id ?? null,
    childrenIds: ctx.childrenList.map((c) => c.id),
    activeChildId: ctx.activeChildId,
    activeChildName: ctx.activeChild?.name ?? null,
    activeChildGrade: ctx.activeChild?.grade,
    childRewardImages: ctx.childRewardImages,
    loading: ctx.loading,
    error: ctx.error,
    hasFetchedOnce: ctx.hasFetchedOnce,
  });

  return (
    <div>
      <div data-testid="active-child-id">{ctx.activeChildId ?? 'null'}</div>
      <div data-testid="active-child-name">{ctx.activeChild?.name ?? 'null'}</div>
      <div data-testid="active-child-grade">
        {ctx.activeChild ? String(ctx.activeChild.grade) : 'no-active-child'}
      </div>
      <div data-testid="children-ids">{ctx.childrenList.map((c) => c.id).join(',')}</div>
      <div data-testid="children-grades">
        {ctx.childrenList.map((c) => `${c.id}:${String(c.grade)}`).join(',')}
      </div>
      <div data-testid="has-fetched-once">{String(ctx.hasFetchedOnce)}</div>
      <div data-testid="loading">{String(ctx.loading)}</div>
      <div data-testid="error">{ctx.error ?? 'null'}</div>
      <div data-testid="reward-state">
        {ctx.childRewardImages === null
          ? 'null'
          : ctx.childRewardImages.isPersonalized
            ? `personalized:${ctx.childRewardImages.winner[0]?.caption ?? ''}`
            : 'empty'}
      </div>
      <button
        type="button"
        data-testid="btn-select-a1"
        onClick={() => ctx.setActiveChildId('child-a-1')}
      >
        Select A1
      </button>
      <button
        type="button"
        data-testid="btn-select-a2"
        onClick={() => ctx.setActiveChildId('child-a-2')}
      >
        Select A2
      </button>
      <button
        type="button"
        data-testid="btn-select-candidate"
        onClick={() => ctx.setActiveChildId(candidateToSelect)}
      >
        Select Candidate
      </button>
      <button type="button" data-testid="btn-refetch" onClick={() => void ctx.fetchChildren()}>
        Refetch
      </button>
    </div>
  );
};

describe('G1a-2 ChildProvider Integration Tests (real ChildProvider + real useChildren + real useChildRewardImagesFetcher)', () => {
  const STORAGE_KEY = 'thomthematica_active_child_id';

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    selectCalls = [];
    updateCalls = [];
    rewardCalls = [];
    rewardImmediateResolver = null;
    currentAuthUser = { id: 'user-a' };
    mockSupabaseClient = createDeferredSupabaseMock();
  });

  it('1. masks initial localStorage candidate while owner list is unverified or failed, exposes it on validated membership, and clears storage on authoritative []', async () => {
    localStorage.setItem(STORAGE_KEY, 'child-a-1');

    render(
      <ChildProvider>
        <ContextConsumerProbe />
      </ChildProvider>
    );

    // 1. While initial SELECT is pending, candidate is masked and reward fetcher is not called for unverified ID
    expect(screen.getByTestId('active-child-id').textContent).toBe('null');
    expect(screen.getByTestId('active-child-name').textContent).toBe('null');
    expect(screen.getByTestId('children-ids').textContent).toBe('');
    expect(screen.getByTestId('reward-state').textContent).toBe('null');
    expect(rewardServiceSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('child-a-1');

    // 2. Initial SELECT fails -> candidate remains in localStorage, public activeChildId remains null
    await act(async () => {
      selectCalls[0].resolve({ data: null, error: { message: 'initial read error' } });
    });
    expect(screen.getByTestId('has-fetched-once').textContent).toBe('false');
    expect(screen.getByTestId('active-child-id').textContent).toBe('null');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('child-a-1');
    expect(rewardServiceSpy).not.toHaveBeenCalled();

    // 3. Refetch succeeds with [childA1] -> candidate 'child-a-1' is verified and exposed
    fireEvent.click(screen.getByTestId('btn-refetch'));
    await act(async () => {
      selectCalls[1].resolve({ data: [childA1], error: null });
    });

    expect(screen.getByTestId('has-fetched-once').textContent).toBe('true');
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');
    expect(screen.getByTestId('active-child-name').textContent).toBe('თომა');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('child-a-1');
    expect(rewardServiceSpy).toHaveBeenCalledWith('child-a-1');

    // 4. Subsequent refetch succeeds with authoritative [] -> self-heal clears activeChildId and localStorage
    fireEvent.click(screen.getByTestId('btn-refetch'));
    await act(async () => {
      selectCalls[2].resolve({ data: [], error: null });
    });

    expect(screen.getByTestId('active-child-id').textContent).toBe('null');
    expect(screen.getByTestId('active-child-name').textContent).toBe('null');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('2. retains selected child and localStorage across failed same-parent refetch and preserves PIN-selected candidate while list read is pending', async () => {
    localStorage.setItem(STORAGE_KEY, 'child-a-1');

    render(
      <ChildProvider>
        <ContextConsumerProbe candidateToSelect="child-a-2" />
      </ChildProvider>
    );

    // Resolve initial fetch with [childA1]
    await act(async () => {
      selectCalls[0].resolve({ data: [childA1], error: null });
    });
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');

    // Failed same-parent refetch must NOT clear activeChildId or localStorage
    fireEvent.click(screen.getByTestId('btn-refetch'));
    await act(async () => {
      selectCalls[1].resolve({ data: null, error: { message: 'transient failure' } });
    });

    expect(screen.getByTestId('error').textContent).toBe('transient failure');
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');
    expect(screen.getByTestId('active-child-name').textContent).toBe('თომა');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('child-a-1');

    // Now start another refetch (pending) and simulate PIN gate selecting 'child-a-2' before refetch resolves
    fireEvent.click(screen.getByTestId('btn-refetch'));
    fireEvent.click(screen.getByTestId('btn-select-candidate'));

    // While 'child-a-2' is not yet in the validated snapshot [childA1], exposed activeChildId is masked (null),
    // but localStorage preserves the candidate 'child-a-2' (self-heal must NOT wipe it while read is pending!)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('child-a-2');
    expect(screen.getByTestId('active-child-id').textContent).toBe('null');

    // Even if that pending refetch fails, 'child-a-2' candidate in localStorage is NOT deleted
    await act(async () => {
      selectCalls[2].resolve({ data: null, error: { message: 'second failure' } });
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('child-a-2');
    expect(screen.getByTestId('active-child-id').textContent).toBe('null');

    // When a subsequent refetch succeeds with [childA1, childA2], 'child-a-2' is verified and exposed!
    fireEvent.click(screen.getByTestId('btn-refetch'));
    await act(async () => {
      selectCalls[3].resolve({ data: [childA1, childA2], error: null });
    });
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-2');
    expect(screen.getByTestId('active-child-name').textContent).toBe('ელენე');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('child-a-2');
  });

  it('3. MANDATORY integration test (real useChildren + real ChildProvider): direct A -> B switch masks A childrenList, activeChild, activeChildId and childRewardImages on B very first render', async () => {
    const snapshots: ObservedContextRender[] = [];
    localStorage.setItem(STORAGE_KEY, 'child-a-1');

    const Wrapper: React.FC<{ user: { id: string; email?: string } | null }> = ({ user }) => {
      currentAuthUser = user;
      return (
        <ChildProvider>
          <ContextConsumerProbe onRenderSnapshot={(snap) => snapshots.push(snap)} />
        </ChildProvider>
      );
    };

    const { rerender } = render(<Wrapper user={{ id: 'user-a' }} />);

    // Resolve A's child list and A's personalized reward images
    await act(async () => {
      selectCalls[0].resolve({ data: [childA1], error: null });
    });
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');
    expect(rewardCalls).toHaveLength(1);
    expect(rewardCalls[0].childId).toBe('child-a-1');

    await act(async () => {
      rewardCalls[0].resolve(personalizedA1);
    });
    expect(screen.getByTestId('reward-state').textContent).toBe('personalized:A1 Win');

    // Start an in-flight A refetch before switching to B
    fireEvent.click(screen.getByTestId('btn-refetch'));
    expect(selectCalls).toHaveLength(2);

    const snapshotCountBeforeSwitch = snapshots.length;

    // Direct switch A -> B without logout intermediate
    rerender(<Wrapper user={{ id: 'user-b' }} />);

    const bSnapshots = snapshots
      .slice(snapshotCountBeforeSwitch)
      .filter((s) => s.authUserId === 'user-b');
    expect(bSnapshots.length).toBeGreaterThanOrEqual(1);

    // Inspect the VERY FIRST render under B (before effects run):
    const firstBSnapshot = bSnapshots[0];
    expect(firstBSnapshot.childrenIds).toEqual([]);
    expect(firstBSnapshot.activeChildId).toBeNull();
    expect(firstBSnapshot.activeChildName).toBeNull();
    expect(firstBSnapshot.childRewardImages).toBeNull();
    expect(firstBSnapshot.hasFetchedOnce).toBe(false);
    expect(firstBSnapshot.error).toBeNull();

    // While B's initial fetch is pending, localStorage still holds the unverified candidate
    expect(localStorage.getItem(STORAGE_KEY)).toBe('child-a-1');

    // Resolve B's child list [childB1] -> self-heals 'child-a-1' out of localStorage
    await act(async () => {
      selectCalls[2].resolve({ data: [childB1], error: null });
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('children-ids').textContent).toBe('child-b-1');
    expect(screen.getByTestId('active-child-id').textContent).toBe('null');

    // Select B's child and resolve B's reward images
    fireEvent.click(screen.getByTestId('btn-select-candidate'));
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-b-1');
    expect(screen.getByTestId('active-child-name').textContent).toBe('ნიტა');

    // Settle older in-flight A request (selectCalls[1]) late: B remains authoritative with zero A leak
    await act(async () => {
      selectCalls[1].resolve({ data: [childA1], error: null });
    });
    expect(screen.getByTestId('children-ids').textContent).toBe('child-b-1');
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-b-1');

    // Same-user token refresh (new user object reference with same id 'user-b') retains state without extra fetch
    const selectCountBeforeRefresh = selectCalls.length;
    rerender(<Wrapper user={{ id: 'user-b', email: 'b@example.com' }} />);
    expect(selectCalls).toHaveLength(selectCountBeforeRefresh);
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-b-1');
    expect(screen.getByTestId('has-fetched-once').textContent).toBe('true');

    // Logout clears context and localStorage
    rerender(<Wrapper user={null} />);
    await waitFor(() => {
      expect(screen.getByTestId('active-child-id').textContent).toBe('null');
      expect(screen.getByTestId('children-ids').textContent).toBe('');
      expect(screen.getByTestId('reward-state').textContent).toBe('null');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  it('4a & 4c. MANDATORY reward barrier (a) & (c): masks child-1 personalized images on first child-2 render, publishes nonpersonalized EMPTY_STATE, and ignores late child-1 reward resolution', async () => {
    const snapshots: ObservedContextRender[] = [];
    localStorage.setItem(STORAGE_KEY, 'child-a-1');

    render(
      <React.StrictMode>
        <ChildProvider>
          <ContextConsumerProbe onRenderSnapshot={(snap) => snapshots.push(snap)} />
        </ChildProvider>
      </React.StrictMode>
    );

    await act(async () => {
      selectCalls[selectCalls.length - 1].resolve({ data: [childA1, childA2], error: null });
    });
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');

    // Resolve personalized images for child-a-1
    await act(async () => {
      rewardCalls[rewardCalls.length - 1].resolve(personalizedA1);
    });
    expect(screen.getByTestId('reward-state').textContent).toBe('personalized:A1 Win');

    const countBeforeChild2 = snapshots.length;

    // Switch from child-a-1 (personalized) to child-a-2
    fireEvent.click(screen.getByTestId('btn-select-a2'));

    const child2Snapshots = snapshots
      .slice(countBeforeChild2)
      .filter((s) => s.activeChildId === 'child-a-2');
    expect(child2Snapshots.length).toBeGreaterThanOrEqual(1);

    // Case (a): On the FIRST child-a-2 render (and every pending render), child-a-1's personalized object is NEVER visible
    for (const snap of child2Snapshots) {
      expect(snap.childRewardImages).toBeNull();
    }

    // Resolve child-a-2 with shared EMPTY_STATE
    const child2RewardCall = rewardCalls.filter((c) => c.childId === 'child-a-2').pop()!;
    await act(async () => {
      child2RewardCall.resolve(SHARED_EMPTY_REWARD_STATE);
    });
    expect(screen.getByTestId('reward-state').textContent).toBe('empty');

    // Case (c): Start a new request on child-a-1 (pending), then switch back to child-a-2, and resolve child-a-1's old request late
    fireEvent.click(screen.getByTestId('btn-select-a1'));
    const lateA1Call = rewardCalls.filter((c) => c.childId === 'child-a-1').pop()!;

    fireEvent.click(screen.getByTestId('btn-select-a2'));
    const nextA2Call = rewardCalls.filter((c) => c.childId === 'child-a-2').pop()!;

    // Resolve stale child-a-1 call late while child-a-2 is active
    await act(async () => {
      lateA1Call.resolve(personalizedA1);
    });
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-2');
    expect(screen.getByTestId('reward-state').textContent).toBe('null');

    await act(async () => {
      nextA2Call.resolve(personalizedA2);
    });
    expect(screen.getByTestId('reward-state').textContent).toBe('personalized:A2 Win');
  });

  it('4b. MANDATORY reward barrier (b): child 1 -> 2 -> 1 transitions each establish a fresh barrier without carrying over an earlier open barrier', async () => {
    const snapshots: ObservedContextRender[] = [];
    localStorage.setItem(STORAGE_KEY, 'child-a-1');

    render(
      <ChildProvider>
        <ContextConsumerProbe onRenderSnapshot={(snap) => snapshots.push(snap)} />
      </ChildProvider>
    );

    await act(async () => {
      selectCalls[0].resolve({ data: [childA1, childA2], error: null });
    });

    // Resolve initial personalized state for child-a-1
    await act(async () => {
      rewardCalls[0].resolve(personalizedA1);
    });
    expect(screen.getByTestId('reward-state').textContent).toBe('personalized:A1 Win');

    // Switch child 1 -> child 2 and resolve personalizedA2 for child-a-2
    fireEvent.click(screen.getByTestId('btn-select-a2'));
    const callA2 = rewardCalls.filter((c) => c.childId === 'child-a-2').pop()!;
    await act(async () => {
      callA2.resolve(personalizedA2);
    });
    expect(screen.getByTestId('reward-state').textContent).toBe('personalized:A2 Win');

    const indexBeforeReturnToA1 = snapshots.length;

    // Now switch child 2 -> child 1 while new child-a-1 request is pending:
    // Must start a NEW barrier for child-a-1 (must NOT leak personalizedA2 on first render!)
    fireEvent.click(screen.getByTestId('btn-select-a1'));

    const returnA1Snapshots = snapshots
      .slice(indexBeforeReturnToA1)
      .filter((s) => s.activeChildId === 'child-a-1');
    expect(returnA1Snapshots.length).toBeGreaterThanOrEqual(1);
    for (const snap of returnA1Snapshots) {
      expect(snap.childRewardImages).toBeNull();
    }

    // Resolve the new child-a-1 request with updated personalized images
    const latestA1Call = rewardCalls.filter((c) => c.childId === 'child-a-1').pop()!;
    await act(async () => {
      latestA1Call.resolve(personalizedA1Updated);
    });
    expect(screen.getByTestId('reward-state').textContent).toBe('personalized:A1 Win v2');
  });

  it('4d & 4e. MANDATORY reward barrier (d) & (e): handles fast batched personalized resolution (signal 3b) and repeated shared EMPTY_STATE singleton without permanent masking', async () => {
    const snapshots: ObservedContextRender[] = [];
    localStorage.setItem(STORAGE_KEY, 'child-a-1');

    render(
      <ChildProvider>
        <ContextConsumerProbe onRenderSnapshot={(snap) => snapshots.push(snap)} />
      </ChildProvider>
    );

    await act(async () => {
      selectCalls[0].resolve({ data: [childA1, childA2], error: null });
    });

    // Resolve child-a-1 with personalizedA1
    await act(async () => {
      rewardCalls[0].resolve(personalizedA1);
    });
    expect(screen.getByTestId('reward-state').textContent).toBe('personalized:A1 Win');

    // Case (d): Configure child-a-2 to resolve IMMEDIATELY with personalizedA2 inside the same act
    rewardImmediateResolver = (id: string) =>
      id === 'child-a-2' ? Promise.resolve(personalizedA2) : null;

    const indexBeforeFastSwitch = snapshots.length;
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-select-a2'));
    });

    const fastA2Snapshots = snapshots
      .slice(indexBeforeFastSwitch)
      .filter((s) => s.activeChildId === 'child-a-2');
    expect(fastA2Snapshots.length).toBeGreaterThanOrEqual(1);

    // In EVERY child-a-2 render, child-a-1's personalizedA1 must NEVER appear
    for (const snap of fastA2Snapshots) {
      expect(snap.childRewardImages).not.toBe(personalizedA1);
    }
    // And personalizedA2 becomes published via barrier signal 3(b)
    expect(screen.getByTestId('reward-state').textContent).toBe('personalized:A2 Win');

    // Case (e): Both child-a-1 and child-a-2 resolve immediately with the EXACT SAME SHARED_EMPTY_REWARD_STATE reference
    rewardImmediateResolver = () => Promise.resolve(SHARED_EMPTY_REWARD_STATE);

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-select-a1'));
    });
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');
    expect(screen.getByTestId('reward-state').textContent).toBe('empty');
    expect(snapshots[snapshots.length - 1].childRewardImages).toBe(SHARED_EMPTY_REWARD_STATE);

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-select-a2'));
    });
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-2');
    expect(screen.getByTestId('reward-state').textContent).toBe('empty');
    expect(snapshots[snapshots.length - 1].childRewardImages).toBe(SHARED_EMPTY_REWARD_STATE);
  });

  it('5. propagates Child.grade values null and 1..6 passively into real Provider childrenList and activeChild under React.StrictMode without mutation or render loops', async () => {
    const allGrades: Array<ChildGrade | null> = [null, 1, 2, 3, 4, 5, 6];
    const gradedChildren: Child[] = allGrades.map((grade, idx) => ({
      id: `child-grade-${idx}`,
      parent_id: 'user-a',
      name: `ბავშვი ${idx}`,
      avatar_id: 'avatar_1',
      gender: idx % 2 === 0 ? 'boy' : 'girl',
      created_at: '2026-01-01T00:00:00Z',
      grade,
    }));

    localStorage.setItem(STORAGE_KEY, 'child-grade-4');

    render(
      <React.StrictMode>
        <ChildProvider>
          <ContextConsumerProbe candidateToSelect="child-grade-0" />
        </ChildProvider>
      </React.StrictMode>
    );

    await act(async () => {
      selectCalls[selectCalls.length - 1].resolve({ data: gradedChildren, error: null });
    });

    expect(screen.getByTestId('children-grades').textContent).toBe(
      'child-grade-0:null,child-grade-1:1,child-grade-2:2,child-grade-3:3,child-grade-4:4,child-grade-5:5,child-grade-6:6'
    );
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-grade-4');
    expect(screen.getByTestId('active-child-grade').textContent).toBe('4');

    // Switch to child-grade-0 (grade: null)
    fireEvent.click(screen.getByTestId('btn-select-candidate'));
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-grade-0');
    expect(screen.getByTestId('active-child-grade').textContent).toBe('null');
  });

  it('6. G1a-3 MANDATORY real-Provider updateChildGrade wiring: exposes required function, invokes real UPDATE (.eq(id).eq(parent_id).select("id")), preserves all 3 result categories, updates childrenList/activeChild.grade only on applied refresh, and retains selection on failed write/refresh', async () => {
    let capturedContextUpdateFn:
      | ((childId: string, grade: ChildGrade) => Promise<UpdateChildGradeResult>)
      | undefined;

    const GradeUpdateConsumer: React.FC = () => {
      const ctx = useChild();
      capturedContextUpdateFn = ctx.updateChildGrade;
      return <ContextConsumerProbe />;
    };

    localStorage.setItem(STORAGE_KEY, 'child-a-1');

    render(
      <ChildProvider>
        <GradeUpdateConsumer />
      </ChildProvider>
    );

    await act(async () => {
      selectCalls[0].resolve({ data: [childA1, childA2], error: null });
    });

    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');
    expect(screen.getByTestId('active-child-grade').textContent).toBe('null');

    // Explicit runtime function check for genuine Step 0 RED
    expect(typeof capturedContextUpdateFn).toBe('function');

    // 1. Category { ok: true, grade: 4, refreshed: true }
    let pSuccess!: Promise<UpdateChildGradeResult>;
    act(() => {
      pSuccess = capturedContextUpdateFn!('child-a-1', 4);
    });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].table).toBe('children');
    expect(updateCalls[0].payload).toEqual({ grade: 4 });
    expect(updateCalls[0].selectCols).toBe('id');
    expect(updateCalls[0].filters).toEqual(
      expect.arrayContaining([
        { field: 'id', val: 'child-a-1' },
        { field: 'parent_id', val: 'user-a' },
      ])
    );

    // Resolve 1-row write proof; before refresh SELECT resolves, activeChild.grade is still null
    await act(async () => {
      updateCalls[0].resolve({ data: [{ id: 'child-a-1' }], error: null });
    });
    expect(screen.getByTestId('active-child-grade').textContent).toBe('null');

    let resSuccess!: UpdateChildGradeResult;
    await act(async () => {
      selectCalls[1].resolve({
        data: [{ ...childA1, grade: 4 }, childA2],
        error: null,
      });
      resSuccess = await pSuccess;
    });

    expect(resSuccess).toEqual({ ok: true, grade: 4, refreshed: true });
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');
    expect(screen.getByTestId('active-child-grade').textContent).toBe('4');
    expect(screen.getByTestId('children-grades').textContent).toBe('child-a-1:4,child-a-2:3');

    // 2. Category { ok: true, grade: 6, refreshed: false } when post-write refresh SELECT fails
    let pPartial!: Promise<UpdateChildGradeResult>;
    act(() => {
      pPartial = capturedContextUpdateFn!('child-a-1', 6);
    });
    await act(async () => {
      updateCalls[1].resolve({ data: [{ id: 'child-a-1' }], error: null });
    });
    let resPartial!: UpdateChildGradeResult;
    await act(async () => {
      selectCalls[2].resolve({ data: null, error: { message: 'refresh failed' } });
      resPartial = await pPartial;
    });

    expect(resPartial).toEqual({ ok: true, grade: 6, refreshed: false });
    // Previous verified grade (4) and selected child ('child-a-1') are retained
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');
    expect(screen.getByTestId('active-child-grade').textContent).toBe('4');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('child-a-1');

    // 3. Category { ok: false, error } when UPDATE returns 0 rows
    let pFail!: Promise<UpdateChildGradeResult>;
    act(() => {
      pFail = capturedContextUpdateFn!('child-a-1', 2);
    });
    let resFail!: UpdateChildGradeResult;
    await act(async () => {
      updateCalls[2].resolve({ data: [], error: null });
      resFail = await pFail;
    });

    expect(resFail.ok).toBe(false);
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');
    expect(screen.getByTestId('active-child-grade').textContent).toBe('4');
  });

  it('7. G1a-3 MANDATORY real-Provider A -> B switch during in-flight updateChildGrade masks A on B first render and prevents A refresh from leaking into B', async () => {
    const snapshots: ObservedContextRender[] = [];
    let capturedContextUpdateFn:
      | ((childId: string, grade: ChildGrade) => Promise<UpdateChildGradeResult>)
      | undefined;

    const Wrapper: React.FC<{ user: { id: string; email?: string } | null }> = ({ user }) => {
      currentAuthUser = user;
      return (
        <ChildProvider>
          < ConsumerWithUpdate />
        </ChildProvider>
      );
    };

    const ConsumerWithUpdate: React.FC = () => {
      const ctx = useChild();
      capturedContextUpdateFn = ctx.updateChildGrade;
      return <ContextConsumerProbe onRenderSnapshot={(snap) => snapshots.push(snap)} />;
    };

    localStorage.setItem(STORAGE_KEY, 'child-a-1');
    const { rerender } = render(<Wrapper user={{ id: 'user-a' }} />);

    await act(async () => {
      selectCalls[0].resolve({ data: [{ ...childA1, grade: 2 }], error: null });
    });
    expect(screen.getByTestId('active-child-id').textContent).toBe('child-a-1');
    expect(screen.getByTestId('active-child-grade').textContent).toBe('2');
    expect(typeof capturedContextUpdateFn).toBe('function');

    // Start A's grade update to 5, confirm 1-row write so A's refresh SELECT (selectCalls[1]) is in flight
    let pUpdateA!: Promise<UpdateChildGradeResult>;
    act(() => {
      pUpdateA = capturedContextUpdateFn!('child-a-1', 5);
    });
    await act(async () => {
      updateCalls[0].resolve({ data: [{ id: 'child-a-1' }], error: null });
    });
    expect(selectCalls).toHaveLength(2);
    expect(selectCalls[1].parentId).toBe('user-a');

    const snapshotCountBeforeSwitch = snapshots.length;

    // Switch directly A -> B while A's post-write refresh SELECT is in flight
    rerender(<Wrapper user={{ id: 'user-b' }} />);

    const bSnapshots = snapshots
      .slice(snapshotCountBeforeSwitch)
      .filter((s) => s.authUserId === 'user-b');
    expect(bSnapshots.length).toBeGreaterThanOrEqual(1);

    // First B render is completely masked
    const firstBSnapshot = bSnapshots[0];
    expect(firstBSnapshot.childrenIds).toEqual([]);
    expect(firstBSnapshot.activeChildId).toBeNull();
    expect(firstBSnapshot.activeChildGrade).toBeUndefined();
    expect(firstBSnapshot.childRewardImages).toBeNull();
    expect(firstBSnapshot.hasFetchedOnce).toBe(false);

    // Resolve B's initial SELECT
    await act(async () => {
      selectCalls[2].resolve({ data: [childB1], error: null });
    });
    expect(screen.getByTestId('children-grades').textContent).toBe('child-b-1:5');

    // Resolve A's stale refresh SELECT late -> A's updateChildGrade returns refreshed:false and B remains intact
    let resUpdateA!: UpdateChildGradeResult;
    await act(async () => {
      selectCalls[1].resolve({ data: [{ ...childA1, grade: 5 }], error: null });
      resUpdateA = await pUpdateA;
    });
    expect(resUpdateA).toEqual({ ok: true, grade: 5, refreshed: false });
    expect(screen.getByTestId('children-ids').textContent).toBe('child-b-1');
  });
});
