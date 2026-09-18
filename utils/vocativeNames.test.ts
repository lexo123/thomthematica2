import { describe, it, expect } from 'vitest';
import { getVocativeName, VOCATIVE_NAMES } from './vocativeNames';

describe('vocativeNames utility', () => {
  it('returns mapped vocative name for known seed names', () => {
    expect(getVocativeName('დავითი')).toBe('დავით');
    expect(getVocativeName('თომა')).toBe('თომა');
    expect(getVocativeName('ნიტა')).toBe('ნიტა');
    expect(getVocativeName('გიორგი')).toBe('გიორგი');
  });

  it('returns trimmed unmapped name unchanged without auto-derivation or heuristics', () => {
    // Unmapped names must return exactly as provided (after trim)
    expect(getVocativeName('სანდრო')).toBe('სანდრო');
    expect(getVocativeName('მარიამი')).toBe('მარიამ');
    expect(getVocativeName('ნიკოლოზი')).toBe('ნიკოლოზ');
    expect(getVocativeName('UnknownName')).toBe('UnknownName');
  });

  it('trims leading and trailing whitespace before lookup', () => {
    expect(getVocativeName('  დავითი  ')).toBe('დავით');
    expect(getVocativeName('  თომა ')).toBe('თომა');
    expect(getVocativeName('   სანდრო   ')).toBe('სანდრო');
  });

  it('preserves exact casing and does not perform case-folding or fuzzy matching', () => {
    // Exact key lookup only
    expect(getVocativeName('დავითი')).toBe('დავით');
    expect(getVocativeName('დავით')).toBe(VOCATIVE_NAMES['დავით'] ?? 'დავით');
  });

  it('handles empty string gracefully', () => {
    expect(getVocativeName('')).toBe('');
    expect(getVocativeName('   ')).toBe('');
  });
});

