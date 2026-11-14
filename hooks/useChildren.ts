import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';
import { ensureProfileExists } from '../lib/ensureProfile';
import { Child, ChildGrade } from '../types';

const CHILD_COLUMNS = 'id, parent_id, name, avatar_id, gender, created_at, grade';

const INSERT_VERIFICATION_ERROR_MESSAGE =
  'ბავშვის დამატება შესაძლოა შესრულდა, მაგრამ მისი გადამოწმება ვერ მოხერხდა. გთხოვთ, გადაამოწმოთ ბავშვების სია, სანამ ხელახლა სცდით.';

const isPlainRecord = (val: unknown): val is Record<string, unknown> => {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
};

const isValidChildGrade = (value: unknown): value is ChildGrade | null => {
  if (value === null) {
    return true;
  }
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6)
  );
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

export const useChildren = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState<boolean>(false);
  const [fetchedForUserId, setFetchedForUserId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchChildren = useCallback(async () => {
    if (!userId) {
      requestIdRef.current += 1;
      setChildren([]);
      setLoading(false);
      setHasFetchedOnce(true);
      setFetchedForUserId(null);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      requestIdRef.current += 1;
      setLoading(false);
      setHasFetchedOnce(true);
      setFetchedForUserId(userId);
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('children')
        .select(CHILD_COLUMNS)
        .eq('parent_id', userId)
        .order('created_at', { ascending: true });

      if (thisRequestId !== requestIdRef.current) {
        return;
      }

      if (fetchErr) {
        throw fetchErr;
      }

      const validatedChildren = validateChildrenList(data, userId);
      setChildren(validatedChildren);
    } catch (err: any) {
      if (thisRequestId !== requestIdRef.current) {
        return;
      }
      setError(err.message || 'ბავშვების სიის ჩატვირთვა ვერ მოხერხდა');
    } finally {
      if (thisRequestId !== requestIdRef.current) {
        return;
      }
      setLoading(false);
      setHasFetchedOnce(true);
      setFetchedForUserId(userId);
    }
  }, [userId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const addChild = async (
    name: string,
    avatarId: string = 'avatar_1',
    gender: 'boy' | 'girl',
    pin: string
  ): Promise<{ child: Child | null; error: Error | null }> => {
    if (!user) {
      return { child: null, error: new Error('ავტორიზაცია აუცილებელია') };
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

    const capturedParentId = user.id;

    try {
      // Self-healing: Ensure parent profile exists safely without overwriting existing data
      await ensureProfileExists(user);

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

      const validatedChild = validateChildRow(data, capturedParentId);
      if (!validatedChild || validatedChild.grade !== null) {
        return {
          child: null,
          error: new Error(INSERT_VERIFICATION_ERROR_MESSAGE),
        };
      }

      setChildren(prev => [...prev, validatedChild]);
      return { child: validatedChild, error: null };
    } catch (err: any) {
      return { child: null, error: new Error(err.message || 'ბავშვის დამატება ვერ მოხერხდა') };
    }
  };

  const isReadyForCurrentUser = hasFetchedOnce && fetchedForUserId === userId;

  return {
    children,
    loading,
    error,
    hasFetchedOnce: isReadyForCurrentUser,
    fetchChildren,
    addChild,
  };
};
