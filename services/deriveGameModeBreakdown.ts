import { GameSession } from '../types';

export interface GameModeBreakdownEntry {
  sessionCount: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracyPercent: number | null; // null if totalQuestions === 0
}

export type GameModeBreakdown = Record<string, GameModeBreakdownEntry>;

/**
 * Pure derivation function grouping completed game sessions by raw game_mode string.
 * Independent of Supabase or any network layer, fully unit-testable.
 *
 * Grouping key is the raw `game_mode` string (NOT the GameMode enum) — consistent
 * with GameSession.game_mode: string and the type-safe lookup contract already
 * established by getGameModeLabel() in Commit #3. No "Unknown" bucket is created;
 * unrecognized modes simply become their own raw-string key. Label presentation
 * (via getGameModeLabel) is a UI concern, not a derivation concern.
 */
export const deriveGameModeBreakdown = (
  sessions: Pick<GameSession, 'game_mode' | 'total_questions' | 'total_correct' | 'status'>[]
): GameModeBreakdown => {
  if (!sessions || !Array.isArray(sessions)) {
    return {};
  }

  // Double-safety re-filter, consistent with deriveDashboardStats() convention
  // (even though the query already filters status === 'completed').
  const completed = sessions.filter((s) => s && s.status === 'completed');

  const breakdown: GameModeBreakdown = {};

  for (const s of completed) {
    const key = s.game_mode;
    if (!breakdown[key]) {
      breakdown[key] = {
        sessionCount: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        accuracyPercent: null,
      };
    }
    breakdown[key].sessionCount += 1;
    breakdown[key].totalQuestions += s.total_questions || 0;
    breakdown[key].totalCorrect += s.total_correct || 0;
  }

  for (const key of Object.keys(breakdown)) {
    const entry = breakdown[key];
    entry.accuracyPercent = entry.totalQuestions > 0 ? (entry.totalCorrect / entry.totalQuestions) * 100 : null;
  }

  return breakdown;
};
