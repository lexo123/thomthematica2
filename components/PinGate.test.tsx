// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { PinGate } from './PinGate';
import * as AuthContext from '../contexts/AuthContext';
import * as ChildContext from '../contexts/ChildContext';
import * as SessionModeContext from '../contexts/SessionModeContext';
import * as supabaseModule from '../lib/supabase';

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
  let childrenSelectSpy: any;
  let childrenEqSpy: any;
  let parentFullNameMock: string | null;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    setSessionModeMock = vi.fn();
    resetSessionModeMock = vi.fn();
    setActiveChildIdMock = vi.fn();
    signOutMock = vi.fn();
    parentFullNameMock = 'გიორგი';

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
                  return { data: { pin_hash: HASH_PARENT_1234 }, error: null };
                }
              }
              return { data: null, error: null };
            }),
          };
        }),
      };
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
        return { select: profilesSelectSpy };
      }
      if (table === 'children') {
        return { select: childrenSelectSpy };
      }
      return { select: vi.fn() };
    });

    vi.spyOn(supabaseModule, 'getSupabase').mockReturnValue({
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
});
