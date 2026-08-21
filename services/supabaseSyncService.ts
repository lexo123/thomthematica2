import { getSupabase } from '../lib/supabase';
import { GameMode } from '../types';

export interface GameSessionPayload {
  childId: string;
  mode: GameMode | string;
  level: number;
  correctCount: number;
  incorrectCount: number;
  durationSeconds?: number;
  startedAt?: string;
  endedAt?: string;
}

export interface WishSyncPayload {
  childId: string;
  wishText: string;
  unlocked?: boolean;
  unlockedAt?: string;
}

/**
 * Saves a completed game session to the Supabase game_sessions table.
 * If Supabase is not configured or childId is missing (e.g. Guest mode), returns null cleanly without throwing.
 */
export const syncGameSessionToSupabase = async (
  session: GameSessionPayload
): Promise<{ success: boolean; data?: any; error?: string }> => {
  if (!session.childId) {
    return { success: false, error: 'childId is required' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase client is not available' };
  }

  // Ensure level is between 1 and 5 according to DB check constraint
  const validLevel = Math.max(1, Math.min(5, session.level || 1));

  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        child_id: session.childId,
        mode: session.mode,
        level: validLevel,
        correct_count: Math.max(0, session.correctCount),
        incorrect_count: Math.max(0, session.incorrectCount),
        duration_seconds: Math.max(0, session.durationSeconds || 0),
        started_at: session.startedAt || new Date().toISOString(),
        ended_at: session.endedAt || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error syncing game session' };
  }
};

/**
 * Saves a child's unlocked wish to the Supabase wishes table.
 * If Supabase is not configured or childId is missing (e.g. Guest mode), returns null cleanly without throwing.
 */
export const syncWishToSupabase = async (
  wish: WishSyncPayload
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const trimmedWish = wish.wishText?.trim();
  if (!trimmedWish) {
    return { success: false, error: 'wishText cannot be empty' };
  }

  if (!wish.childId) {
    return { success: false, error: 'childId is required' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase client is not available' };
  }

  try {
    const { data, error } = await supabase
      .from('wishes')
      .insert({
        child_id: wish.childId,
        wish_text: trimmedWish,
        unlocked: wish.unlocked ?? true,
        unlocked_at: wish.unlockedAt || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error syncing wish' };
  }
};

/**
 * Fetches all wishes for a specific child from Supabase.
 */
export const fetchChildWishes = async (childId: string): Promise<{ data: any[] | null; error: string | null }> => {
  if (!childId) return { data: [], error: null };

  const supabase = getSupabase();
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  try {
    const { data, error } = await supabase
      .from('wishes')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error fetching wishes' };
  }
};

/**
 * Fetches recent game sessions for a specific child from Supabase.
 */
export const fetchChildSessions = async (childId: string): Promise<{ data: any[] | null; error: string | null }> => {
  if (!childId) return { data: [], error: null };

  const supabase = getSupabase();
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error fetching game sessions' };
  }
};
