// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import * as supabaseJs from '@supabase/supabase-js';
import { PinGate, deriveParentPinStatus } from './PinGate';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as SessionModeContext from '../contexts/SessionModeContext';
import * as supabaseModule from '../lib/supabase';

vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@supabase/supabase-js')>();
  return {
    ...actual,
    createClient: vi.fn(),
  };
});

// Real SHA-256 hashes:
// SHA-256('1234')
const HASH_PARENT_1234 = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
// SHA-256('5678')
const HASH_CHILD_A_5678 = 'f8638b979b2f4f793ddb6dbd197e0ee25a7a6ea32b0ae22f5e3c5d119d839e75';
// SHA-256('4321')
const HASH_CHILD_B_4321 = 'fe2592b42a727e977f055947385b709cc82b16b9a87f88c6abf3900d65d0cdc3';

describe('PinGate Component — Two-Stage Identity-First Flow', () => {
  let setSessionModeMock: any;
  let resetSessionModeMock: any;
  let setActiveChildIdMock: any;
  let signOutMock: any;
  let profilesSelectSpy: any;
  let profilesUpdateSpy: any;
  let profilesUpdateEqSpy: any;
  let profilesUpdateSelectSpy: any;
  let childrenSelectSpy: any;
  let childrenEqSpy: any;
  let parentFullNameMock: string | null;
  let parentPinHashResultMock: { data: { pin_hash: string | null } | null; error: any };
  let childPinHashResultOverride: Record<string, { data: { pin_hash: string | null } | null; error: any }>;
  let mainSignInWithPasswordSpy: any;
  let tempSignInWithPasswordSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    setSessionModeMock = vi.fn();
    resetSessionModeMock = vi.fn();
    setActiveChildIdMock = vi.fn();
    signOutMock = vi.fn();
    parentFullNameMock = 'გიორგი';
    parentPinHashResultMock = { data: { pin_hash: HASH_PARENT_1234 }, error: null };
    childPinHashResultOverride = {};

    mainSignInWithPasswordSpy = vi.fn();
    tempSignInWithPasswordSpy = vi.fn().mockResolvedValue({ data: { session: {} }, error: null });

    vi.mocked(supabaseJs.createClient).mockReturnValue({
      auth: {
        signInWithPassword: tempSignInWithPasswordSpy,
      },
    } as any);

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
      childrenList: [],
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

    profilesSelectSpy = vi.fn().mockImplementation((columns: string) => {
      return {
        eq: vi.fn().mockImplementation((col: string, val: string) => {
          return {
            maybeSingle: vi.fn().mockImplementation(async () => {
              if (col === 'id' && val === 'parent-123') {
                if (columns === 'full_name') {
                  return { data: { full_name: parentFullNameMock }, error: null };
                }
                if (columns === 'pin_hash') {
                  return parentPinHashResultMock;
                }
              }
              return { data: null, error: null };
            }),
          };
        }),
      };
    });

    profilesUpdateSelectSpy = vi.fn().mockResolvedValue({
      data: [{ id: 'parent-123' }],
      error: null,
    });
    profilesUpdateEqSpy = vi.fn().mockReturnValue({
      select: profilesUpdateSelectSpy,
    });
    profilesUpdateSpy = vi.fn().mockReturnValue({
      eq: profilesUpdateEqSpy,
    });

    childrenEqSpy = vi.fn().mockImplementation((col: string, val: string) => {
      if (col === 'parent_id' && val === 'parent-123') {
        return Promise.resolve({
          data: [
            { id: 'child-a', name: 'თომა', avatar_id: 'avatar_1' },
            { id: 'child-b', name: 'ნიტა', avatar_id: 'avatar_3' },
          ],
          error: null,
        });
      }
      if (col === 'id') {
        return {
          maybeSingle: vi.fn().mockImplementation(async () => {
            if (val in childPinHashResultOverride) {
              return childPinHashResultOverride[val];
            }
            if (val === 'child-a') {
              return { data: { pin_hash: HASH_CHILD_A_5678 }, error: null };
            }
            if (val === 'child-b') {
              return { data: { pin_hash: HASH_CHILD_B_4321 }, error: null };
            }
            return { data: null, error: null };
          }),
        };
      }
      return Promise.resolve({ data: [], error: null });
    });

    childrenSelectSpy = vi.fn().mockImplementation(() => {
      return {
        eq: childrenEqSpy,
      };
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return { select: profilesSelectSpy, update: profilesUpdateSpy };
      }
      if (table === 'children') {
        return { select: childrenSelectSpy };
      }
      return { select: vi.fn() };
    });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
      auth: {
        signInWithPassword: mainSignInWithPasswordSpy,
      },
      from: mockFrom,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('Stage 1: fetches ONLY identity metadata (not pin_hash) and renders parent + children items', async () => {
    render(<PinGate />);

    await waitFor(() => {
      expect(screen.getByText('გიორგი')).toBeDefined();
      expect(screen.getByText('თომა')).toBeDefined();
      expect(screen.getByText('ნიტა')).toBeDefined();
    });

    expect(screen.getByText('ვინ შედის?')).toBeDefined();
    expect(screen.getByText('🦁')).toBeDefined();
    expect(screen.getByText('🦄')).toBeDefined();

    // Stage 1 must ONLY request metadata columns, never pin_hash
    expect(profilesSelectSpy).toHaveBeenCalledWith('full_name');
    expect(profilesSelectSpy).not.toHaveBeenCalledWith('pin_hash');
    expect(childrenSelectSpy).toHaveBeenCalledWith('id, name, avatar_id');
    expect(childrenSelectSpy).not.toHaveBeenCalledWith('pin_hash');
    expect(childrenSelectSpy).not.toHaveBeenCalledWith('id, pin_hash');
  });

  it('Stage 1: falls back to "მშობელი" when parent full_name is empty', async () => {
    parentFullNameMock = '';
    render(<PinGate />);

    await waitFor(() => {
      expect(screen.getByText('მშობელი')).toBeDefined();
    });
  });

  it('Stage 1 -> Stage 2 -> Back ("← უკან"): transitions to Stage 2 with identity header and returns to Stage 1 clearing PIN', async () => {
    render(<PinGate />);

    await waitFor(() => {
      expect(screen.getByText('თომა')).toBeDefined();
    });

    // Click child "თომა"
    fireEvent.click(screen.getByText('თომა'));

    // Stage 2 header shows whose PIN is requested
    expect(screen.getByText('შეიყვანეთ თომა-ის PIN')).toBeDefined();
    expect(screen.getByText('← უკან')).toBeDefined();

    // Enter 2 digits
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('6'));

    // Click "← უკან"
    fireEvent.click(screen.getByText('← უკან'));

    // Back in Stage 1
    expect(screen.getByText('ვინ შედის?')).toBeDefined();

    // Re-select "თომა" -> PIN should be cleared (Clear button disabled when pin.length === 0)
    fireEvent.click(screen.getByText('თომა'));
    const clearBtn = screen.getByTitle('გასუფთავება') as HTMLButtonElement;
    expect(clearBtn.disabled).toBe(true);
  });

  it('Stage 2 (Parent): fetches ONLY parent pin_hash and transitions to parent mode on match', async () => {
    render(<PinGate />);

    await waitFor(() => {
      expect(screen.getByText('გიორგი')).toBeDefined();
    });

    fireEvent.click(screen.getByText('გიორგი'));
    expect(screen.getByText('შეიყვანეთ გიორგი-ის PIN')).toBeDefined();

    profilesSelectSpy.mockClear();
    childrenSelectSpy.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('4'));
    });

    await waitFor(() => {
      expect(setSessionModeMock).toHaveBeenCalledWith('parent');
    });

    expect(setActiveChildIdMock).not.toHaveBeenCalled();
    // Strictly scoped: queried profiles.pin_hash only, did NOT query children.pin_hash
    expect(profilesSelectSpy).toHaveBeenCalledWith('pin_hash');
    expect(childrenSelectSpy).not.toHaveBeenCalled();
  });

  it('Stage 2 (Child): fetches ONLY selected child row pin_hash and atomically sets activeChildId + child mode', async () => {
    render(<PinGate />);

    await waitFor(() => {
      expect(screen.getByText('თომა')).toBeDefined();
    });

    fireEvent.click(screen.getByText('თომა'));
    expect(screen.getByText('შეიყვანეთ თომა-ის PIN')).toBeDefined();

    profilesSelectSpy.mockClear();
    childrenSelectSpy.mockClear();
    childrenEqSpy.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByText('5'));
      fireEvent.click(screen.getByText('6'));
      fireEvent.click(screen.getByText('7'));
      fireEvent.click(screen.getByText('8'));
    });

    await waitFor(() => {
      expect(setActiveChildIdMock).toHaveBeenCalledWith('child-a');
      expect(setSessionModeMock).toHaveBeenCalledWith('child');
    });

    // Strictly scoped: queried ONLY children.pin_hash where id = 'child-a', never profiles or parent_id
    expect(childrenSelectSpy).toHaveBeenCalledWith('pin_hash');
    expect(childrenEqSpy).toHaveBeenCalledWith('id', 'child-a');
    expect(profilesSelectSpy).not.toHaveBeenCalled();
  });

  it('Cross-identity isolation: entering Parent PIN or Sibling PIN while Child A is selected fails and only queries Child A row', async () => {
    render(<PinGate />);

    await waitFor(() => {
      expect(screen.getByText('თომა')).toBeDefined();
    });

    // Select Child A ("თომა")
    fireEvent.click(screen.getByText('თომა'));

    profilesSelectSpy.mockClear();
    childrenSelectSpy.mockClear();
    childrenEqSpy.mockClear();

    // 1. Try entering Parent's valid PIN ('1234') under Child A's identity
    await act(async () => {
      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('4'));
    });

    await waitFor(() => {
      expect(screen.getByText('არასწორი PIN თომა-სთვის')).toBeDefined();
    });

    expect(setSessionModeMock).not.toHaveBeenCalled();
    expect(setActiveChildIdMock).not.toHaveBeenCalled();
    expect(profilesSelectSpy).not.toHaveBeenCalled();
    expect(childrenEqSpy).toHaveBeenCalledTimes(1);
    expect(childrenEqSpy).toHaveBeenCalledWith('id', 'child-a');

    childrenEqSpy.mockClear();

    // 2. Try entering Sibling Child B's valid PIN ('4321') under Child A's identity
    await act(async () => {
      fireEvent.click(screen.getByText('4'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('1'));
    });

    await waitFor(() => {
      expect(screen.getByText('არასწორი PIN თომა-სთვის')).toBeDefined();
    });

    expect(setSessionModeMock).not.toHaveBeenCalled();
    expect(setActiveChildIdMock).not.toHaveBeenCalled();
    expect(childrenEqSpy).toHaveBeenCalledTimes(1);
    expect(childrenEqSpy).toHaveBeenCalledWith('id', 'child-a');
    expect(childrenEqSpy).not.toHaveBeenCalledWith('id', 'child-b');

    // 3. Go back, select Parent ("გიორგი"), and try entering Child A's valid PIN ('5678')
    fireEvent.click(screen.getByText('← უკან'));
    fireEvent.click(screen.getByText('გიორგი'));

    profilesSelectSpy.mockClear();
    childrenSelectSpy.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByText('5'));
      fireEvent.click(screen.getByText('6'));
      fireEvent.click(screen.getByText('7'));
      fireEvent.click(screen.getByText('8'));
    });

    await waitFor(() => {
      expect(screen.getByText('არასწორი PIN გიორგი-სთვის')).toBeDefined();
    });

    expect(setSessionModeMock).not.toHaveBeenCalled();
    expect(setActiveChildIdMock).not.toHaveBeenCalled();
    expect(profilesSelectSpy).toHaveBeenCalledWith('pin_hash');
    expect(childrenSelectSpy).not.toHaveBeenCalled();
  });

  it('clears pin when clear button is clicked in Stage 2', async () => {
    render(<PinGate />);

    await waitFor(() => {
      expect(screen.getByText('გიორგი')).toBeDefined();
    });

    fireEvent.click(screen.getByText('გიორგი'));

    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('2'));

    const clearBtn = screen.getByTitle('გასუფთავება');
    fireEvent.click(clearBtn);

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

  // --- COMMIT 2: Parent NULL PIN Setup & Fail-Closed Semantics ---

  describe('COMMIT 2: deriveParentPinStatus fail-closed semantics & Parent NULL PIN Setup', () => {
    it('deriveParentPinStatus enforces strict 4-case fail-closed semantics', () => {
      // 1. Row does not exist (error === null, data === null) -> 'error' (fail-closed, never 'no_pin')
      expect(deriveParentPinStatus(null, null)).toBe('error');
      // 2. Query error -> 'error'
      expect(deriveParentPinStatus({ pin_hash: null }, { message: 'DB error' })).toBe('error');
      // 3. Row exists, pin_hash is null -> 'no_pin'
      expect(deriveParentPinStatus({ pin_hash: null }, null)).toBe('no_pin');
      // 4. Row exists, pin_hash is empty string -> 'no_pin'
      expect(deriveParentPinStatus({ pin_hash: '' }, null)).toBe('no_pin');
      // 5. Row exists, pin_hash is populated -> 'has_pin'
      expect(deriveParentPinStatus({ pin_hash: HASH_PARENT_1234 }, null)).toBe('has_pin');
    });

    it('does NOT query profiles.pin_hash on Stage 1 render, and queries it once when parent identity is clicked', async () => {
      render(<PinGate />);

      await waitFor(() => {
        expect(screen.getByText('გიორგი')).toBeDefined();
      });

      expect(profilesSelectSpy).toHaveBeenCalledWith('full_name');
      expect(profilesSelectSpy).not.toHaveBeenCalledWith('pin_hash');

      fireEvent.click(screen.getByText('გიორგი'));

      await waitFor(() => {
        expect(profilesSelectSpy).toHaveBeenCalledWith('pin_hash');
      });

      // Existing PIN -> setup screen does NOT appear
      expect(screen.queryByText('მშობლის PIN-ის დაყენება')).toBeNull();
      expect(screen.getByText('შეიყვანეთ გიორგი-ის PIN')).toBeDefined();
    });

    it('renders setup screen (not "არასწორი PIN") when parent row exists with pin_hash: null or empty string', async () => {
      parentPinHashResultMock = { data: { pin_hash: null }, error: null };

      render(<PinGate />);

      await waitFor(() => {
        expect(screen.getByText('გიორგი')).toBeDefined();
      });

      fireEvent.click(screen.getByText('გიორგი'));

      await waitFor(() => {
        expect(screen.getByText('მშობლის PIN-ის დაყენება')).toBeDefined();
      });

      expect(screen.getByPlaceholderText('ანგარიშის პაროლი')).toBeDefined();
      expect(screen.queryByText(/არასწორი PIN/)).toBeNull();
      expect(setSessionModeMock).not.toHaveBeenCalled();
    });

    it('fail-closed on profiles.pin_hash query error or missing row (data === null): shows error message and "← უკან", does not open setup or change sessionMode', async () => {
      // Case A: DB error
      parentPinHashResultMock = { data: null, error: { message: 'RLS or network error' } };

      const { unmount } = render(<PinGate />);

      await waitFor(() => {
        expect(screen.getByText('გიორგი')).toBeDefined();
      });

      fireEvent.click(screen.getByText('გიორგი'));

      await waitFor(() => {
        expect(screen.getByText('შემოწმება ვერ მოხერხდა, სცადეთ თავიდან')).toBeDefined();
      });

      expect(screen.getByText('← უკან')).toBeDefined();
      expect(screen.queryByText('მშობლის PIN-ის დაყენება')).toBeNull();
      expect(setSessionModeMock).not.toHaveBeenCalled();

      unmount();

      // Case B: error === null, data === null (missing profile row) -> fail-closed 'error'
      parentPinHashResultMock = { data: null, error: null };
      render(<PinGate />);

      await waitFor(() => {
        expect(screen.getByText('გიორგი')).toBeDefined();
      });

      fireEvent.click(screen.getByText('გიორგი'));

      await waitFor(() => {
        expect(screen.getByText('შემოწმება ვერ მოხერხდა, სცადეთ თავიდან')).toBeDefined();
      });

      expect(screen.queryByText('მშობლის PIN-ის დაყენება')).toBeNull();
      expect(setSessionModeMock).not.toHaveBeenCalled();
    });

    it('wrong password during setup does not start PIN input step and uses temporary Supabase client (not main client)', async () => {
      parentPinHashResultMock = { data: { pin_hash: null }, error: null };
      tempSignInWithPasswordSpy.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      });

      render(<PinGate />);

      await waitFor(() => {
        expect(screen.getByText('გიორგი')).toBeDefined();
      });

      fireEvent.click(screen.getByText('გიორგი'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('ანგარიშის პაროლი')).toBeDefined();
      });

      fireEvent.change(screen.getByPlaceholderText('ანგარიშის პაროლი'), {
        target: { value: 'wrong-pass' },
      });
      fireEvent.click(screen.getByText('პაროლის დადასტურება'));

      await waitFor(() => {
        expect(screen.getByText('არასწორი პაროლი')).toBeDefined();
      });

      // Temporary client was created with non-persisting auth options
      expect(supabaseJs.createClient).toHaveBeenCalledWith(
        supabaseModule.cleanUrl,
        supabaseModule.cleanKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );
      expect(tempSignInWithPasswordSpy).toHaveBeenCalledWith({
        email: 'parent@example.com',
        password: 'wrong-pass',
      });
      // Main client signInWithPassword must NEVER be called
      expect(mainSignInWithPasswordSpy).not.toHaveBeenCalled();

      // PIN inputs do not appear and update is not called
      expect(screen.queryByPlaceholderText('ახალი PIN')).toBeNull();
      expect(profilesUpdateSpy).not.toHaveBeenCalled();
      expect(setSessionModeMock).not.toHaveBeenCalled();
    });

    it('when password is valid but profiles.update affects 0 rows, setup stays incomplete with error and sessionMode does not change', async () => {
      parentPinHashResultMock = { data: { pin_hash: null }, error: null };
      profilesUpdateSelectSpy.mockResolvedValue({
        data: [],
        error: null,
      });

      render(<PinGate />);

      await waitFor(() => {
        expect(screen.getByText('გიორგი')).toBeDefined();
      });

      fireEvent.click(screen.getByText('გიორგი'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('ანგარიშის პაროლი')).toBeDefined();
      });

      fireEvent.change(screen.getByPlaceholderText('ანგარიშის პაროლი'), {
        target: { value: 'correct-pass' },
      });
      fireEvent.click(screen.getByText('პაროლის დადასტურება'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('ახალი PIN')).toBeDefined();
      });

      fireEvent.change(screen.getByPlaceholderText('ახალი PIN'), { target: { value: '1234' } });
      fireEvent.change(screen.getByPlaceholderText('გაიმეორეთ PIN'), { target: { value: '1234' } });
      fireEvent.click(screen.getByText('PIN-ის შენახვა'));

      await waitFor(() => {
        expect(screen.getByText('PIN-ის შენახვა ვერ მოხერხდა, სცადეთ თავიდან')).toBeDefined();
      });

      expect(profilesUpdateSpy).toHaveBeenCalledWith({ pin_hash: HASH_PARENT_1234 });
      expect(profilesUpdateEqSpy).toHaveBeenCalledWith('id', 'parent-123');
      expect(profilesUpdateSelectSpy).toHaveBeenCalledWith('id');

      // Stays on setup screen, does NOT transition to Stage 2 PIN keypad or parent mode
      expect(screen.getByText('მშობლის PIN-ის დაყენება')).toBeDefined();
      expect(screen.queryByText('შეიყვანეთ გიორგი-ის PIN')).toBeNull();
      expect(setSessionModeMock).not.toHaveBeenCalled();
    });

    it('when password is valid and profiles.update updates 1 row, transitions back to Stage 2 PIN entry without auto-opening parent mode', async () => {
      parentPinHashResultMock = { data: { pin_hash: null }, error: null };
      profilesUpdateSelectSpy.mockResolvedValue({
        data: [{ id: 'parent-123' }],
        error: null,
      });

      render(<PinGate />);

      await waitFor(() => {
        expect(screen.getByText('გიორგი')).toBeDefined();
      });

      fireEvent.click(screen.getByText('გიორგი'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('ანგარიშის პაროლი')).toBeDefined();
      });

      fireEvent.change(screen.getByPlaceholderText('ანგარიშის პაროლი'), {
        target: { value: 'correct-pass' },
      });
      fireEvent.click(screen.getByText('პაროლის დადასტურება'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('ახალი PIN')).toBeDefined();
      });

      expect(mainSignInWithPasswordSpy).not.toHaveBeenCalled();

      // Update mock so subsequent Stage 2 verification sees the saved hash
      parentPinHashResultMock = { data: { pin_hash: HASH_PARENT_1234 }, error: null };

      fireEvent.change(screen.getByPlaceholderText('ახალი PIN'), { target: { value: '1234' } });
      fireEvent.change(screen.getByPlaceholderText('გაიმეორეთ PIN'), { target: { value: '1234' } });
      fireEvent.click(screen.getByText('PIN-ის შენახვა'));

      // Returns to regular Stage 2 PIN-entry screen
      await waitFor(() => {
        expect(screen.getByText('შეიყვანეთ გიორგი-ის PIN')).toBeDefined();
      });

      // Must NOT auto-enter parent mode before entering the PIN on Stage 2
      expect(setSessionModeMock).not.toHaveBeenCalled();

      // Now parent enters the newly set PIN on Stage 2
      await act(async () => {
        fireEvent.click(screen.getByText('1'));
        fireEvent.click(screen.getByText('2'));
        fireEvent.click(screen.getByText('3'));
        fireEvent.click(screen.getByText('4'));
      });

      await waitFor(() => {
        expect(setSessionModeMock).toHaveBeenCalledWith('parent');
      });
    });
  });

  // --- COMMIT 3: Child NULL PIN & Error Differentiation ---

  describe('COMMIT 3: Child verifyPin distinguishes query error, NULL/empty PIN, and wrong PIN', () => {
    it('(a) shows "შემოწმება ვერ მოხერხდა, სცადეთ თავიდან" and keeps access closed on children.pin_hash query error', async () => {
      childPinHashResultOverride['child-a'] = {
        data: null,
        error: { message: 'Query failed' },
      };

      render(<PinGate />);

      await waitFor(() => {
        expect(screen.getByText('თომა')).toBeDefined();
      });

      fireEvent.click(screen.getByText('თომა'));

      await act(async () => {
        fireEvent.click(screen.getByText('5'));
        fireEvent.click(screen.getByText('6'));
        fireEvent.click(screen.getByText('7'));
        fireEvent.click(screen.getByText('8'));
      });

      await waitFor(() => {
        expect(screen.getByText('შემოწმება ვერ მოხერხდა, სცადეთ თავიდან')).toBeDefined();
      });

      expect(setSessionModeMock).not.toHaveBeenCalled();
      expect(setActiveChildIdMock).not.toHaveBeenCalled();
      expect(screen.queryByText('მშობლის PIN-ის დაყენება')).toBeNull();
    });

    it('(b) shows "ამ ბავშვს PIN არ აქვს დაყენებული. გთხოვეთ მშობელს." when child pin_hash is null or empty, without any setup screen', async () => {
      childPinHashResultOverride['child-a'] = {
        data: { pin_hash: null },
        error: null,
      };

      render(<PinGate />);

      await waitFor(() => {
        expect(screen.getByText('თომა')).toBeDefined();
      });

      fireEvent.click(screen.getByText('თომა'));

      await act(async () => {
        fireEvent.click(screen.getByText('5'));
        fireEvent.click(screen.getByText('6'));
        fireEvent.click(screen.getByText('7'));
        fireEvent.click(screen.getByText('8'));
      });

      await waitFor(() => {
        expect(screen.getByText('ამ ბავშვს PIN არ აქვს დაყენებული. გთხოვეთ მშობელს.')).toBeDefined();
      });

      expect(setSessionModeMock).not.toHaveBeenCalled();
      expect(setActiveChildIdMock).not.toHaveBeenCalled();
      expect(screen.queryByText('მშობლის PIN-ის დაყენება')).toBeNull();
    });

    it('(c) shows "არასწორი PIN თომა-სთვის" when child pin_hash exists but does not match', async () => {
      render(<PinGate />);

      await waitFor(() => {
        expect(screen.getByText('თომა')).toBeDefined();
      });

      fireEvent.click(screen.getByText('თომა'));

      await act(async () => {
        fireEvent.click(screen.getByText('9'));
        fireEvent.click(screen.getByText('9'));
        fireEvent.click(screen.getByText('9'));
        fireEvent.click(screen.getByText('9'));
      });

      await waitFor(() => {
        expect(screen.getByText('არასწორი PIN თომა-სთვის')).toBeDefined();
      });

      expect(setSessionModeMock).not.toHaveBeenCalled();
      expect(setActiveChildIdMock).not.toHaveBeenCalled();
    });
  });
});
