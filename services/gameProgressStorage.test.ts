// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveGameProgress,
  loadGameProgress,
  clearGameProgress,
} from './gameProgressStorage';

describe('gameProgressStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs save -> load round-trip correctly', () => {
    const childId = 'child-123';
    const gameMode = 'thomthematica';
    const answers = [true, false, true, true];

    saveGameProgress(childId, gameMode, answers);

    const loaded = loadGameProgress(childId, gameMode);
    expect(loaded).toEqual(answers);
  });

  it('returns null when entry does not exist', () => {
    const loaded = loadGameProgress('non-existent', 'thomthematica');
    expect(loaded).toBeNull();
  });

  it('returns null and removes entry when TTL (48 hours) has expired', () => {
    const childId = 'child-123';
    const gameMode = 'thomthematica';
    const answers = [true, true];

    // Save with timestamp 49 hours ago
    const pastTime = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(
      `gameProgress:${childId}:${gameMode}`,
      JSON.stringify({ v: 1, recentAnswers: answers, savedAt: pastTime })
    );

    const loaded = loadGameProgress(childId, gameMode);
    expect(loaded).toBeNull();
    // Entry should be cleaned up
    expect(localStorage.getItem(`gameProgress:${childId}:${gameMode}`)).toBeNull();
  });

  it('returns null and does not crash when payload has invalid version (v !== 1)', () => {
    const childId = 'child-123';
    const gameMode = 'thomthematica';

    localStorage.setItem(
      `gameProgress:${childId}:${gameMode}`,
      JSON.stringify({ v: 2, recentAnswers: [true], savedAt: new Date().toISOString() })
    );

    const loaded = loadGameProgress(childId, gameMode);
    expect(loaded).toBeNull();
  });

  it('returns null and does not crash on malformed JSON', () => {
    const childId = 'child-123';
    const gameMode = 'thomthematica';

    localStorage.setItem(`gameProgress:${childId}:${gameMode}`, '{invalid-json');

    const loaded = loadGameProgress(childId, gameMode);
    expect(loaded).toBeNull();
  });

  it('returns null and does not crash when recentAnswers is not an array', () => {
    const childId = 'child-123';
    const gameMode = 'thomthematica';

    localStorage.setItem(
      `gameProgress:${childId}:${gameMode}`,
      JSON.stringify({ v: 1, recentAnswers: 'not-an-array', savedAt: new Date().toISOString() })
    );

    const loaded = loadGameProgress(childId, gameMode);
    expect(loaded).toBeNull();
  });

  it('handles localStorage throwing exceptions safely without crashing (e.g. quota exceeded or private browsing)', () => {
    const childId = 'child-123';
    const gameMode = 'thomthematica';

    // Mock localStorage.setItem to throw once
    vi.spyOn(window.localStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => saveGameProgress(childId, gameMode, [true])).not.toThrow();

    // Mock localStorage.getItem to throw once
    vi.spyOn(window.localStorage, 'getItem').mockImplementationOnce(() => {
      throw new Error('SecurityError');
    });

    expect(() => loadGameProgress(childId, gameMode)).not.toThrow();
    // And verify it safely returned null on exception:
    vi.spyOn(window.localStorage, 'getItem').mockImplementationOnce(() => {
      throw new Error('SecurityError');
    });
    expect(loadGameProgress(childId, gameMode)).toBeNull();

    // Mock localStorage.removeItem to throw once
    vi.spyOn(window.localStorage, 'removeItem').mockImplementationOnce(() => {
      throw new Error('SecurityError');
    });

    expect(() => clearGameProgress(childId, gameMode)).not.toThrow();
  });

  it('clears progress correctly with clearGameProgress', () => {
    const childId = 'child-123';
    const gameMode = 'thomthematica';

    saveGameProgress(childId, gameMode, [true, false]);
    expect(loadGameProgress(childId, gameMode)).toEqual([true, false]);

    clearGameProgress(childId, gameMode);
    expect(loadGameProgress(childId, gameMode)).toBeNull();
  });
});
