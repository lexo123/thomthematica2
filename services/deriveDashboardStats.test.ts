import { describe, it, expect } from 'vitest';
import { deriveDashboardStats } from './deriveDashboardStats';

describe('deriveDashboardStats (Pure derivation function)', () => {
  it('returns zeroes and null accuracyPercent for an empty array', () => {
    const result = deriveDashboardStats([]);

    expect(result).toEqual({
      completedSessionCount: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      accuracyPercent: null,
      perfectBlocksCount: 0,
    });
  });

  it('correctly aggregates multiple completed sessions', () => {
    const sessions = [
      { total_questions: 40, total_correct: 38, perfect_blocks_count: 0, status: 'completed' as const },
      { total_questions: 40, total_correct: 40, perfect_blocks_count: 1, status: 'completed' as const },
      { total_questions: 20, total_correct: 18, perfect_blocks_count: 0, status: 'completed' as const },
    ];

    const result = deriveDashboardStats(sessions);

    expect(result.completedSessionCount).toBe(3);
    expect(result.totalQuestions).toBe(100);
    expect(result.totalCorrect).toBe(96);
    expect(result.perfectBlocksCount).toBe(1);
    expect(result.accuracyPercent).toBe(96);
  });

  it('strictly excludes active sessions from aggregation', () => {
    const sessions = [
      { total_questions: 40, total_correct: 35, perfect_blocks_count: 0, status: 'completed' as const },
      { total_questions: 15, total_correct: 10, perfect_blocks_count: 0, status: 'active' as const },
    ];

    const result = deriveDashboardStats(sessions);

    expect(result.completedSessionCount).toBe(1);
    expect(result.totalQuestions).toBe(40);
    expect(result.totalCorrect).toBe(35);
    expect(result.perfectBlocksCount).toBe(0);
    expect(result.accuracyPercent).toBe(87.5);
  });

  it('handles sessions with total_questions: 0 without division by zero or errors', () => {
    // Only zero question session
    const zeroOnly = [
      { total_questions: 0, total_correct: 0, perfect_blocks_count: 0, status: 'completed' as const },
    ];
    const zeroResult = deriveDashboardStats(zeroOnly);
    expect(zeroResult.completedSessionCount).toBe(1);
    expect(zeroResult.totalQuestions).toBe(0);
    expect(zeroResult.totalCorrect).toBe(0);
    expect(zeroResult.accuracyPercent).toBeNull();

    // Zero question session mixed with normal sessions
    const mixed = [
      { total_questions: 0, total_correct: 0, perfect_blocks_count: 0, status: 'completed' as const },
      { total_questions: 50, total_correct: 45, perfect_blocks_count: 2, status: 'completed' as const },
    ];
    const mixedResult = deriveDashboardStats(mixed);
    expect(mixedResult.completedSessionCount).toBe(2);
    expect(mixedResult.totalQuestions).toBe(50);
    expect(mixedResult.totalCorrect).toBe(45);
    expect(mixedResult.accuracyPercent).toBe(90);
    expect(mixedResult.perfectBlocksCount).toBe(2);
  });

  it('calculates 100% accuracy for a perfect score scenario', () => {
    const sessions = [
      { total_questions: 40, total_correct: 40, perfect_blocks_count: 1, status: 'completed' as const },
      { total_questions: 40, total_correct: 40, perfect_blocks_count: 1, status: 'completed' as const },
    ];

    const result = deriveDashboardStats(sessions);

    expect(result.completedSessionCount).toBe(2);
    expect(result.totalQuestions).toBe(80);
    expect(result.totalCorrect).toBe(80);
    expect(result.perfectBlocksCount).toBe(2);
    expect(result.accuracyPercent).toBe(100);
  });

  it('aggregates across sessions regardless of underlying game mode or extra properties', () => {
    const sessions = [
      { total_questions: 40, total_correct: 39, perfect_blocks_count: 0, status: 'completed' as const, game_mode: 'thomthematica' },
      { total_questions: 20, total_correct: 20, perfect_blocks_count: 1, status: 'completed' as const, game_mode: 'kveshmicera' },
      { total_questions: 10, total_correct: 8, perfect_blocks_count: 0, status: 'completed' as const, game_mode: 'gethometria' },
    ];

    const result = deriveDashboardStats(sessions);

    expect(result.completedSessionCount).toBe(3);
    expect(result.totalQuestions).toBe(70);
    expect(result.totalCorrect).toBe(67);
    expect(result.perfectBlocksCount).toBe(1);
    expect(result.accuracyPercent).toBeCloseTo((67 / 70) * 100, 5);
  });
});
