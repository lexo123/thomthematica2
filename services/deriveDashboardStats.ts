import { GameSession } from '../types';

export interface DashboardStats {
  completedSessionCount: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracyPercent: number | null; // null if totalQuestions === 0 (division-by-zero guard)
  perfectBlocksCount: number;
}

/**
 * Pure derivation function calculating aggregate stats across completed game sessions.
 * Independent of Supabase or any network layer, fully unit-testable.
 */
export const deriveDashboardStats = (
  sessions: Pick<GameSession, 'total_questions' | 'total_correct' | 'perfect_blocks_count' | 'status'>[]
): DashboardStats => {
  if (!sessions || !Array.isArray(sessions)) {
    return {
      completedSessionCount: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      accuracyPercent: null,
      perfectBlocksCount: 0,
    };
  }

  // Filter only status === 'completed' (double-safety even if query already filters)
  const completed = sessions.filter((s) => s && s.status === 'completed');

  const totalQuestions = completed.reduce((sum, s) => sum + (s.total_questions || 0), 0);
  const totalCorrect = completed.reduce((sum, s) => sum + (s.total_correct || 0), 0);
  const perfectBlocksCount = completed.reduce((sum, s) => sum + (s.perfect_blocks_count || 0), 0);
  const accuracyPercent = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : null;

  return {
    completedSessionCount: completed.length,
    totalQuestions,
    totalCorrect,
    accuracyPercent,
    perfectBlocksCount,
  };
};
