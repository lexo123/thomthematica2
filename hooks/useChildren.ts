import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';
import { Child } from '../types';

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

export const getAvatarEmoji = (avatarId?: string): string => {
  const found = CHILD_AVATARS.find(a => a.id === avatarId);
  return found ? found.emoji : '🦁';
};

export const useChildren = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!user) {
      setChildren([]);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchErr) {
        throw fetchErr;
      }

      setChildren((data as Child[]) || []);
    } catch (err: any) {
      setError(err.message || 'ბავშვების სიის ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const addChild = async (name: string, avatarId: string = 'avatar_1'): Promise<{ child: Child | null; error: Error | null }> => {
    if (!user) {
      return { child: null, error: new Error('ავტორიზაცია აუცილებელია') };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { child: null, error: new Error('გთხოვთ შეიყვანოთ სახელი') };
    }

    const supabase = getSupabase();
    if (!supabase) {
      return { child: null, error: new Error('Supabase არ არის კონფიგურირებული') };
    }

    try {
      // Self-healing: Ensure parent profile exists in public.profiles table
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || '',
      }, { onConflict: 'id' });

      const { data, error: insertErr } = await supabase
        .from('children')
        .insert({
          parent_id: user.id,
          name: trimmedName,
          avatar_id: avatarId,
        })
        .select()
        .single();

      if (insertErr) {
        throw insertErr;
      }

      const newChild = data as Child;
      setChildren(prev => [...prev, newChild]);
      return { child: newChild, error: null };
    } catch (err: any) {
      return { child: null, error: new Error(err.message || 'ბავშვის დამატება ვერ მოხერხდა') };
    }
  };

  return {
    children,
    loading,
    error,
    fetchChildren,
    addChild,
  };
};
