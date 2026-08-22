import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

/**
 * Self-healing helper that ensures a record exists in public.profiles for the given auth user.
 * 
 * Key guarantees:
 * 1. Uses `ignoreDuplicates: true` (`ON CONFLICT (id) DO NOTHING`) to ensure that an existing profile
 *    is never modified or overwritten (e.g. preserving custom full_name even if user_metadata is empty).
 * 2. Acts as a defensive fallback behind the primary DB trigger `handle_new_user()`.
 * 3. Never throws unhandled exceptions.
 */
export const ensureProfileExists = async (user: User | null): Promise<boolean> => {
  if (!user) return false;

  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const fullName = user.user_metadata?.full_name || '';

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: fullName,
        },
        {
          onConflict: 'id',
          ignoreDuplicates: true, // Guarantees existing row and full_name are never overwritten
        }
      );

    if (error) {
      console.warn('ensureProfileExists: fallback profile check returned error:', error.message);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('ensureProfileExists: unexpected error:', err?.message || err);
    return false;
  }
};
