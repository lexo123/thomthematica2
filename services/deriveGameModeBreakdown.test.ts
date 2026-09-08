import { describe, it, expect } from 'vitest';
import { deriveGameModeBreakdown } from './deriveGameModeBreakdown';

describe('deriveGameModeBreakdown', () => {
  it('returns empty object when sessions array is empty, null, or undefined', () => {
    expect(deriveGameModeBreakdown([])).toEqual({});
    expect(deriveGameModeBreakdown(null as any)).toEqual({});
    expect(deriveGameModeBreakdown(undefined as any)).toEqual({});
  });

  it('correctly aggregates a single mode with multiple sessions', () => {
    const sessions = [
      {
        game_mode: 'thomthematica',
        total_questions: 40,
        total_correct: 38,
        status: 'completed' as const,
      },
      {
        game_mode: 'thomthematica',
        total_questions: 40,
        total_correct: 40,
        status: 'completed' as const,
      },
    ];

    const result = deriveGameModeBreakdown(sessions);

    expect(result).toEqual({
      thomthematica: {
        sessionCount: 2,
        totalQuestions: 80,
        totalCorrect: 78,
        accuracyPercent: 97.5,
      },
    });
  });

  it('correctly separates buckets for multiple distinct game modes', () => {
    const sessions = [
      {
        game_mode: 'thomthematica',
        total_questions: 40,
        total_correct: 40,
        status: 'completed' as const,
      },
      {
        game_mode: 'gethometria',
        total_questions: 20,
        total_correct: 18,
        status: 'completed' as const,
      },
      {
        game_mode: 'kveshmicera',
        total_questions: 30,
        total_correct: 15,
        status: 'completed' as const,
      },
      {
        game_mode: 'gethometria',
        total_questions: 20,
        total_correct: 20,
        status: 'completed' as const,
      },
    ];

    const result = deriveGameModeBreakdown(sessions);

    expect(result['thomthematica']).toEqual({
      sessionCount: 1,
      totalQuestions: 40,
      totalCorrect: 40,
      accuracyPercent: 100,
    });

    expect(result['gethometria']).toEqual({
      sessionCount: 2,
      totalQuestions: 40,
      totalCorrect: 38,
      accuracyPercent: 95,
    });

    expect(result['kveshmicera']).toEqual({
      sessionCount: 1,
      totalQuestions: 30,
      totalCorrect: 15,
      accuracyPercent: 50,
    });
  });

  it('filters out sessions where status !== "completed" (double-safety re-filter)', () => {
    const sessions = [
      {
        game_mode: 'thomthematica',
        total_questions: 40,
        total_correct: 40,
        status: 'completed' as const,
      },
      {
        game_mode: 'thomthematica',
        total_questions: 20,
        total_correct: 10,
        status: 'abandoned' as any,
      },
      {
        game_mode: 'kveshmicera',
        total_questions: 15,
        total_correct: 5,
        status: 'in_progress' as any,
      },
    ];

    const result = deriveGameModeBreakdown(sessions);

    expect(result['thomthematica']).toEqual({
      sessionCount: 1,
      totalQuestions: 40,
      totalCorrect: 40,
      accuracyPercent: 100,
    });
    expect(result['kveshmicera']).toBeUndefined();
  });

  it('sets accuracyPercent to null if totalQuestions is 0', () => {
    const sessions = [
      {
        game_mode: 'custom_mode',
        total_questions: 0,
        total_correct: 0,
        status: 'completed' as const,
      },
    ];

    const result = deriveGameModeBreakdown(sessions);

    expect(result['custom_mode']).toEqual({
      sessionCount: 1,
      totalQuestions: 0,
      totalCorrect: 0,
      accuracyPercent: null,
    });
  });

  it('groups unrecognized / legacy mode string under its own raw key without crashing and without an Unknown bucket', () => {
    const sessions = [
      {
        game_mode: 'legacy_experimental_game',
        total_questions: 10,
        total_correct: 8,
        status: 'completed' as const,
      },
    ];

    const result = deriveGameModeBreakdown(sessions);

    expect(result['legacy_experimental_game']).toEqual({
      sessionCount: 1,
      totalQuestions: 10,
      totalCorrect: 8,
      accuracyPercent: 80,
    });
    expect(result['Unknown']).toBeUndefined();
    expect(result['unknown']).toBeUndefined();
  });
});
