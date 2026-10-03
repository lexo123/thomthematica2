import { GameSession } from '../types';

export interface DashboardStats {
  sessionCount: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracyPercent: number | null; // null if totalQuestions === 0 (division-by-zero guard)
  perfectBlocksCount: number;
}

/**
 * Pure derivation function calculating aggregate stats across all game sessions (active and completed).
 * Independent of Supabase or any network layer, fully unit-testable.
 */
export const deriveDashboardStats = (
  sessions: Pick<GameSession, 'total_questions' | 'total_correct' | 'perfect_blocks_count' | 'status'>[]
): DashboardStats => {
  if (!sessions || !Array.isArray(sessions)) {
    return {
      sessionCount: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      accuracyPercent: null,
      perfectBlocksCount: 0,
    };
  }

  // Count all valid sessions, regardless of status (active or completed)
  const validSessions = sessions.filter((s) => Boolean(s));

  const totalQuestions = validSessions.reduce((sum, s) => sum + (s.total_questions || 0), 0);
  const totalCorrect = validSessions.reduce((sum, s) => sum + (s.total_correct || 0), 0);
  const perfectBlocksCount = validSessions.reduce((sum, s) => sum + (s.perfect_blocks_count || 0), 0);
  const accuracyPercent = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : null;

  return {
    sessionCount: validSessions.length,
    totalQuestions,
    totalCorrect,
    accuracyPercent,
    perfectBlocksCount,
  };
};
