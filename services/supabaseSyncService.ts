import { getSupabase } from '../lib/supabase';
import { GameMode, GameSession, Wish } from '../types';

export interface GameSessionPayload {
  id?: string;
  childId: string;
  gameMode: GameMode | string;
  totalQuestions: number;
  totalCorrect: number;
  perfectBlocksCount?: number;
  durationSeconds?: number;
  status?: 'active' | 'completed';
  startedAt?: string;
  endedAt?: string | null;
}

export interface WishSyncPayload {
  id?: string;
  childId: string;
  wishText: string;
  correctCount: 39 | 40 | number;
  status?: 'pending' | 'fulfilled';
  fulfilledAt?: string | null;
  createdAt?: string;
}

/**
 * Saves or updates a game session in the Supabase game_sessions table.
 * Uses exact schema column names: game_mode, total_questions, total_correct, perfect_blocks_count, duration_seconds, status.
 * If Supabase is not configured or childId is missing (e.g. Guest mode), returns clean error without throwing.
 */
export const syncGameSessionToSupabase = async (
  session: GameSessionPayload
): Promise<{ success: boolean; data?: GameSession; error?: string }> => {
  if (!session.childId) {
    return { success: false, error: 'childId is required' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase client is not available' };
  }

  const totalQuestions = Math.max(0, session.totalQuestions);
  const totalCorrect = Math.max(0, Math.min(totalQuestions, session.totalCorrect));
  const status = session.status || 'completed';

  const payload: Record<string, any> = {
    child_id: session.childId,
    game_mode: session.gameMode,
    total_questions: totalQuestions,
    total_correct: totalCorrect,
    perfect_blocks_count: Math.max(0, session.perfectBlocksCount || 0),
    duration_seconds: Math.max(0, session.durationSeconds || 0),
    status: status,
    started_at: session.startedAt || new Date().toISOString(),
    ended_at: session.endedAt || (status === 'completed' ? new Date().toISOString() : null),
  };

  if (session.id) {
    payload.id = session.id;
  }

  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as GameSession };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error syncing game session' };
  }
};

/**
 * Saves or updates a qualified wish (39/40 or 40/40) in the Supabase wishes table.
 * Uses exact schema column names: wish_text, correct_count (39 | 40), status ('pending' | 'fulfilled'), fulfilled_at.
 * If Supabase is not configured or childId is missing (e.g. Guest mode), returns clean error without throwing.
 */
export const syncWishToSupabase = async (
  wish: WishSyncPayload
): Promise<{ success: boolean; data?: Wish; error?: string }> => {
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

  // Schema constraint: correct_count IN (39, 40)
  const validCorrectCount = wish.correctCount === 39 ? 39 : 40;
  const status = wish.status || 'pending';

  const payload: Record<string, any> = {
    child_id: wish.childId,
    wish_text: trimmedWish,
    correct_count: validCorrectCount,
    status: status,
    fulfilled_at: status === 'fulfilled' ? (wish.fulfilledAt || new Date().toISOString()) : null,
  };

  if (wish.id) {
    payload.id = wish.id;
  }

  try {
    const { data, error } = await supabase
      .from('wishes')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Wish };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error syncing wish' };
  }
};

/**
 * Updates a wish status (e.g. parent marks wish fulfilled).
 */
export const updateWishStatus = async (
  wishId: string,
  status: 'pending' | 'fulfilled'
): Promise<{ success: boolean; error?: string }> => {
  if (!wishId) return { success: false, error: 'wishId is required' };

  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase client is not available' };

  try {
    const { error } = await supabase
      .from('wishes')
      .update({
        status,
        fulfilled_at: status === 'fulfilled' ? new Date().toISOString() : null,
      })
      .eq('id', wishId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error updating wish' };
  }
};

/**
 * Fetches all wishes for a specific child from Supabase.
 */
export const fetchChildWishes = async (childId: string): Promise<{ data: Wish[] | null; error: string | null }> => {
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
    return { data: (data as Wish[]) || [], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error fetching wishes' };
  }
};

/**
 * Fetches recent game sessions for a specific child from Supabase.
 */
export const fetchChildSessions = async (childId: string): Promise<{ data: GameSession[] | null; error: string | null }> => {
  if (!childId) return { data: [], error: null };

  const supabase = getSupabase();
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('child_id', childId)
      .order('started_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data as GameSession[]) || [], error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Error fetching game sessions' };
  }
};
