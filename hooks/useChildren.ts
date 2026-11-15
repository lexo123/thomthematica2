import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';
import { ensureProfileExists } from '../lib/ensureProfile';
import { Child, ChildGrade } from '../types';

const CHILD_COLUMNS = 'id, parent_id, name, avatar_id, gender, created_at, grade';

const INSERT_VERIFICATION_ERROR_MESSAGE =
  'ბავშვის დამატება შესაძლოა შესრულდა, მაგრამ მისი გადამოწმება ვერ მოხერხდა. გთხოვთ, გადაამოწმოთ ბავშვების სია, სანამ ხელახლა სცდით.';

const PRE_INSERT_ACCOUNT_CHANGED_ERROR_MESSAGE =
  'აქტიური ანგარიში შეიცვალა. ბავშვის დამატება შეწყდა.';

const IN_FLIGHT_INSERT_ACCOUNT_CHANGED_ERROR_MESSAGE =
  'აქტიური ანგარიში შეიცვალა ბავშვის დამატებისას; ჩანაწერი შესაძლოა შენახულია წინა ანგარიშზე.';

const isPlainRecord = (val: unknown): val is Record<string, unknown> => {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
};

const extractErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error && err.message.length > 0) {
    return err.message;
  }
  if (isPlainRecord(err) && typeof err.message === 'string' && err.message.length > 0) {
    return err.message;
  }
  return fallback;
};

export type UpdateChildGradeResult =
  | { ok: true; grade: ChildGrade; refreshed: boolean }
  | { ok: false; error: Error };

const isStrictSelectableChildGrade = (value: unknown): value is ChildGrade => {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6)
  );
};

const isConfirmedSingleChildUpdate = (data: unknown, expectedChildId: string): boolean => {
  if (!Array.isArray(data) || data.length !== 1) {
    return false;
  }
  const row = data[0];
  return isPlainRecord(row) && typeof row.id === 'string' && row.id === expectedChildId;
};

const isValidChildGrade = (value: unknown): value is ChildGrade | null => {
  if (value === null) {
    return true;
  }
  return isStrictSelectableChildGrade(value);
};

const validateChildRow = (raw: unknown, expectedParentId: string): Child | null => {
  if (!isPlainRecord(raw)) {
    return null;
  }
  if (typeof raw.id !== 'string' || raw.id.length === 0) {
    return null;
  }
  if (typeof raw.parent_id !== 'string' || raw.parent_id !== expectedParentId) {
    return null;
  }
  if (typeof raw.name !== 'string') {
    return null;
  }
  if (typeof raw.avatar_id !== 'string') {
    return null;
  }
  if (raw.gender !== 'boy' && raw.gender !== 'girl') {
    return null;
  }
  if (typeof raw.created_at !== 'string') {
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(raw, 'grade')) {
    return null;
  }
  const rawGrade = raw.grade;
  if (!isValidChildGrade(rawGrade)) {
    return null;
  }

  return {
    id: raw.id,
    parent_id: raw.parent_id,
    name: raw.name,
    avatar_id: raw.avatar_id,
    gender: raw.gender,
    created_at: raw.created_at,
    grade: rawGrade,
  };
};

const validateChildrenList = (data: unknown, expectedParentId: string): Child[] => {
  if (!Array.isArray(data)) {
    throw new Error('ბავშვების სიის მონაცემები არასწორი ფორმატისაა');
  }

  const validatedList: Child[] = [];
  const seenIds = new Set<string>();

  for (const rawRow of data) {
    const validated = validateChildRow(rawRow, expectedParentId);
    if (!validated) {
      throw new Error('ბავშვის მონაცემები არასწორი ფორმატისაა');
    }
    if (seenIds.has(validated.id)) {
      throw new Error('ბავშვების სიაში აღმოჩნდა დუბლირებული ID');
    }
    seenIds.add(validated.id);
    validatedList.push(validated);
  }

  return validatedList;
};

export const CHILD_AVATARS: { id: string; emoji: string; label: string }[] = [
  { id: 'avatar_1', emoji: '🦁', label: 'ლომი' },
  { id: 'avatar_2', emoji: '🚀', label: 'რაკეტა' },
  { id: 'avatar_3', emoji: '🦄', label: 'უნიკორნი' },
  { id: 'avatar_4', emoji: '🦖', label: 'დინოზავრი' },
  { id: 'avatar_5', emoji: '👑', label: 'გვირგვინი' },
  { id: 'avatar_6', emoji: '⚽', label: 'ბურთი' },
  { id: 'avatar_7', emoji: '🐱', label: 'კნუტი' },
  { id: 'avatar_8', emoji: '🐶', label: 'ლეკვი' },
  { id: 'avatar_9', emoji: '🦊', label: 'მელა' },
  { id: 'avatar_10', emoji: '🐼', label: 'პანდა' },
  { id: 'avatar_11', emoji: '🐬', label: 'დელფინი' },
  { id: 'avatar_12', emoji: '🌟', label: 'ვარსკვლავი' },
];

export const GENDER_OPTIONS: { id: 'boy' | 'girl'; emoji: string; label: string }[] = [
  { id: 'boy', emoji: '👦', label: 'ბიჭი' },
  { id: 'girl', emoji: '👧', label: 'გოგო' },
];

export const getAvatarEmoji = (avatarId?: string): string => {
  const found = CHILD_AVATARS.find(a => a.id === avatarId);
  return found ? found.emoji : '🦁';
};

interface OwnerChildrenState {
  ownerId: string | null;
  children: Child[];
  loading: boolean;
  error: string | null;
  hasFetchedOnce: boolean;
  appliedFetchSeq: number;
}

type RunChildrenFetchResult =
  | { status: 'applied'; rows: Child[] }
  | { status: 'failed' }
  | { status: 'stale' };

export const useChildren = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Idempotent render assignment so async callbacks always compare against the latest rendered parent ID
  const currentUserIdRef = useRef<string | null>(userId);
  currentUserIdRef.current = userId;

  const [ownerState, setOwnerState] = useState<OwnerChildrenState>({
    ownerId: null,
    children: [],
    loading: false,
    error: null,
    hasFetchedOnce: false,
    appliedFetchSeq: 0,
  });

  // C2 current-owner membership ref updated during render
  const ownerStateRef = useRef<OwnerChildrenState>(ownerState);
  ownerStateRef.current = ownerState;

  const requestIdRef = useRef<number>(0);
  const activeSelectRef = useRef<{ requestId: number; ownerId: string } | null>(null);

  const runChildrenFetch = useCallback(async (): Promise<RunChildrenFetchResult> => {
    const capturedUserId = userId;

    // Stale-callback guard: if invoked after parent identity changed, do nothing on current owner state
    if (capturedUserId !== currentUserIdRef.current) {
      return { status: 'stale' };
    }

    if (!capturedUserId) {
      requestIdRef.current += 1;
      activeSelectRef.current = null;
      setOwnerState({
        ownerId: null,
        children: [],
        loading: false,
        error: null,
        hasFetchedOnce: false,
        appliedFetchSeq: 0,
      });
      return { status: 'failed' };
    }

    const supabase = getSupabase();
    if (!supabase) {
      if (capturedUserId !== currentUserIdRef.current) {
        return { status: 'stale' };
      }
      requestIdRef.current += 1;
      activeSelectRef.current = null;
      setOwnerState(prev => {
        const isSameOwner = prev.ownerId === capturedUserId;
        return {
          ownerId: capturedUserId,
          children: isSameOwner ? prev.children : [],
          loading: false,
          error: 'Supabase არ არის კონფიგურირებული',
          hasFetchedOnce: isSameOwner ? prev.hasFetchedOnce : false,
          appliedFetchSeq: isSameOwner ? prev.appliedFetchSeq : 0,
        };
      });
      return { status: 'failed' };
    }

    const thisRequestId = ++requestIdRef.current;
    activeSelectRef.current = { requestId: thisRequestId, ownerId: capturedUserId };

    const isStillCurrent = (): boolean =>
      capturedUserId === currentUserIdRef.current &&
      thisRequestId === requestIdRef.current;

    setOwnerState(prev =>
      prev.ownerId === capturedUserId
        ? {
            ...prev,
            loading: true,
            error: null,
          }
        : {
            ownerId: capturedUserId,
            children: [],
            loading: true,
            error: null,
            hasFetchedOnce: false,
            appliedFetchSeq: 0,
          }
    );

    try {
      const { data, error: fetchErr } = await supabase
        .from('children')
        .select(CHILD_COLUMNS)
        .eq('parent_id', capturedUserId)
        .order('created_at', { ascending: true });

      if (!isStillCurrent()) {
        return { status: 'stale' };
      }

      if (fetchErr) {
        throw fetchErr;
      }

      const validatedChildren = validateChildrenList(data, capturedUserId);

      if (!isStillCurrent()) {
        return { status: 'stale' };
      }

      setOwnerState(prev => {
        const prevSeq = prev.ownerId === capturedUserId ? prev.appliedFetchSeq : 0;
        return {
          ownerId: capturedUserId,
          children: validatedChildren,
          loading: false,
          error: null,
          hasFetchedOnce: true,
          appliedFetchSeq: prevSeq + 1,
        };
      });

      return { status: 'applied', rows: validatedChildren };
    } catch (err: unknown) {
      if (!isStillCurrent()) {
        return { status: 'stale' };
      }
      const errMsg = extractErrorMessage(err, 'ბავშვების სიის ჩატვირთვა ვერ მოხერხდა');
      setOwnerState(prev => {
        const isSameOwner = prev.ownerId === capturedUserId;
        return {
          ownerId: capturedUserId,
          children: isSameOwner ? prev.children : [],
          loading: false,
          error: errMsg,
          hasFetchedOnce: isSameOwner ? prev.hasFetchedOnce : false,
          appliedFetchSeq: isSameOwner ? prev.appliedFetchSeq : 0,
        };
      });
      return { status: 'failed' };
    } finally {
      if (activeSelectRef.current?.requestId === thisRequestId) {
        activeSelectRef.current = null;
      }
      if (isStillCurrent()) {
        setOwnerState(prev =>
          prev.ownerId === capturedUserId && prev.loading
            ? { ...prev, loading: false }
            : prev
        );
      }
    }
  }, [userId]);

  const fetchChildren = useCallback(async (): Promise<void> => {
    await runChildrenFetch();
  }, [runChildrenFetch]);

  useEffect(() => {
    void fetchChildren();
  }, [fetchChildren]);

  const addChild = async (
    name: string,
    avatarId: string = 'avatar_1',
    gender: 'boy' | 'girl',
    pin: string
  ): Promise<{ child: Child | null; error: Error | null }> => {
    if (!user || !currentUserIdRef.current) {
      return { child: null, error: new Error('ავტორიზაცია აუცილებელია') };
    }

    const capturedUser = user;
    const capturedParentId = user.id;

    if (capturedParentId !== currentUserIdRef.current) {
      return { child: null, error: new Error(PRE_INSERT_ACCOUNT_CHANGED_ERROR_MESSAGE) };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { child: null, error: new Error('გთხოვთ შეიყვანოთ სახელი') };
    }

    if (!pin) {
      return { child: null, error: new Error('PIN კოდი აუცილებელია') };
    }

    const supabase = getSupabase();
    if (!supabase) {
      return { child: null, error: new Error('Supabase არ არის კონფიგურირებული') };
    }

    try {
      // Self-healing: Ensure parent profile exists safely without overwriting existing data
      await ensureProfileExists(capturedUser);

      // Pre-INSERT switch guard: if account changed while profile check was pending, do not send INSERT
      if (capturedParentId !== currentUserIdRef.current) {
        return { child: null, error: new Error(PRE_INSERT_ACCOUNT_CHANGED_ERROR_MESSAGE) };
      }

      const { data, error: insertErr } = await supabase
        .from('children')
        .insert({
          parent_id: capturedParentId,
          name: trimmedName,
          avatar_id: avatarId,
          gender: gender,
          pin_hash: pin,
        })
        .select(CHILD_COLUMNS)
        .single();

      if (insertErr) {
        throw insertErr;
      }

      // G1a-1 partial-success verification precedence: check returned row validity first
      const validatedChild = validateChildRow(data, capturedParentId);
      if (!validatedChild || validatedChild.grade !== null) {
        return {
          child: null,
          error: new Error(INSERT_VERIFICATION_ERROR_MESSAGE),
        };
      }

      // In-flight INSERT switch guard: do not append A's child into B's state or return as B success
      if (capturedParentId !== currentUserIdRef.current) {
        return {
          child: null,
          error: new Error(IN_FLIGHT_INSERT_ACCOUNT_CHANGED_ERROR_MESSAGE),
        };
      }

      const hadInFlightSameOwnerSelect =
        activeSelectRef.current !== null &&
        activeSelectRef.current.ownerId === capturedParentId;

      setOwnerState(prev => {
        if (prev.ownerId !== capturedParentId) {
          return {
            ownerId: capturedParentId,
            children: [validatedChild],
            loading: false,
            error: null,
            hasFetchedOnce: false,
            appliedFetchSeq: 0,
          };
        }
        const alreadyExists = prev.children.some(c => c.id === validatedChild.id);
        return {
          ...prev,
          children: alreadyExists ? prev.children : [...prev.children, validatedChild],
        };
      });

      if (hadInFlightSameOwnerSelect) {
        // Supersede any pre-INSERT in-flight SELECT with a guarded current-owner post-INSERT fetch
        // so the older snapshot cannot overwrite validatedChild and loading always settles (B3 liveness).
        void fetchChildren();
      }

      return { child: validatedChild, error: null };
    } catch (err: unknown) {
      return {
        child: null,
        error: new Error(extractErrorMessage(err, 'ბავშვის დამატება ვერ მოხერხდა')),
      };
    }
  };

  const updateChildGrade = useCallback(
    async (childId: string, grade: ChildGrade): Promise<UpdateChildGradeResult> => {
      if (!user || !currentUserIdRef.current) {
        return { ok: false, error: new Error('ავტორიზაცია აუცილებელია') };
      }

      const capturedParentId = userId;
      if (!capturedParentId || capturedParentId !== currentUserIdRef.current) {
        return {
          ok: false,
          error: new Error('აქტიური ანგარიში შეიცვალა. კლასის განახლება შეწყდა.'),
        };
      }

      if (typeof childId !== 'string' || childId.trim().length === 0) {
        return { ok: false, error: new Error('ბავშვის იდენტიფიკატორი არასწორია') };
      }

      if (!isStrictSelectableChildGrade(grade)) {
        return {
          ok: false,
          error: new Error('კლასი უნდა იყოს მთელი რიცხვი 1-დან 6-მდე'),
        };
      }

      if (
        ownerStateRef.current.ownerId !== capturedParentId ||
        !ownerStateRef.current.children.some(child => child.id === childId)
      ) {
        return {
          ok: false,
          error: new Error('ბავშვი ვერ მოიძებნა მიმდინარე ანგარიშის სიაში'),
        };
      }

      const supabase = getSupabase();
      if (!supabase) {
        return { ok: false, error: new Error('Supabase არ არის კონფიგურირებული') };
      }

      try {
        const { data, error: updateErr } = await supabase
          .from('children')
          .update({ grade })
          .eq('id', childId)
          .eq('parent_id', capturedParentId)
          .select('id');

        if (updateErr) {
          return {
            ok: false,
            error: new Error(extractErrorMessage(updateErr, 'კლასის განახლება ვერ მოხერხდა')),
          };
        }

        if (!isConfirmedSingleChildUpdate(data, childId)) {
          return {
            ok: false,
            error: new Error('კლასის განახლება ვერ დადასტურდა'),
          };
        }
      } catch (err: unknown) {
        return {
          ok: false,
          error: new Error(extractErrorMessage(err, 'კლასის განახლება ვერ მოხერხდა')),
        };
      }

      if (capturedParentId !== currentUserIdRef.current) {
        return { ok: true, grade, refreshed: false };
      }

      try {
        const refreshOutcome = await runChildrenFetch();

        if (
          capturedParentId !== currentUserIdRef.current ||
          refreshOutcome.status !== 'applied'
        ) {
          return { ok: true, grade, refreshed: false };
        }

        const refreshedChild = refreshOutcome.rows.find(c => c.id === childId);
        if (!refreshedChild || refreshedChild.grade !== grade) {
          return { ok: true, grade, refreshed: false };
        }

        return { ok: true, grade, refreshed: true };
      } catch {
        return { ok: true, grade, refreshed: false };
      }
    },
    [user, userId, runChildrenFetch]
  );

  // Derive public output synchronously against current userId for first-render owner isolation
  const isCurrentOwnerState = userId !== null && ownerState.ownerId === userId;
  const exposedChildren = isCurrentOwnerState ? ownerState.children : [];
  const exposedLoading = isCurrentOwnerState ? ownerState.loading : false;
  const exposedError = isCurrentOwnerState ? ownerState.error : null;
  const exposedHasFetchedOnce = isCurrentOwnerState ? ownerState.hasFetchedOnce : false;
  const exposedAppliedFetchSeq = isCurrentOwnerState ? ownerState.appliedFetchSeq : 0;

  return {
    children: exposedChildren,
    loading: exposedLoading,
    error: exposedError,
    hasFetchedOnce: exposedHasFetchedOnce,
    appliedFetchSeq: exposedAppliedFetchSeq,
    fetchChildren,
    addChild,
    updateChildGrade,
  };
};
