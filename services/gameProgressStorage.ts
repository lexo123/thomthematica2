export interface StoredGameProgress {
  v: 1;
  recentAnswers: boolean[];
  savedAt: string; // ISO timestamp
}

const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

const buildKey = (childId: string, gameMode: string): string =>
  `gameProgress:${childId}:${gameMode}`;

export const saveGameProgress = (childId: string, gameMode: string, recentAnswers: boolean[]): void => {
  try {
    const payload: StoredGameProgress = { v: 1, recentAnswers, savedAt: new Date().toISOString() };
    localStorage.setItem(buildKey(childId, gameMode), JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (private browsing, quota) - do not throw
  }
};

export const loadGameProgress = (childId: string, gameMode: string): boolean[] | null => {
  try {
    const raw = localStorage.getItem(buildKey(childId, gameMode));
    if (!raw) return null;
    const parsed: StoredGameProgress = JSON.parse(raw);
    if (parsed.v !== 1 || !Array.isArray(parsed.recentAnswers)) return null;
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (age > TTL_MS) {
      localStorage.removeItem(buildKey(childId, gameMode));
      return null;
    }
    return parsed.recentAnswers;
  } catch {
    return null;
  }
};

export const clearGameProgress = (childId: string, gameMode: string): void => {
  try {
    localStorage.removeItem(buildKey(childId, gameMode));
  } catch {
    // no-op
  }
};
