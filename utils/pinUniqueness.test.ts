import { describe, it, expect } from 'vitest';
import { isPinTaken } from './pinUniqueness';

describe('pinUniqueness utility - isPinTaken', () => {
  const hashParent = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // "1234"
  const hashChild1 = '473287f8298dba7163a897908958f7c0eae733e25d2e027992ea2edc9bed2fa8'; // "0000"
  const hashChild2 = '9f83463185f71e0c2d5c4866ec4c32d24186447a97801e7f579fce448f8dd40e'; // "test"
  const hashOther = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // "password"

  it('returns true when candidate matches parent PIN hash', () => {
    const existing = [hashParent, hashChild1, hashChild2];
    expect(isPinTaken(hashParent, existing)).toBe(true);
  });

  it('returns true when candidate matches any child PIN hash', () => {
    const existing = [hashParent, hashChild1, hashChild2];
    expect(isPinTaken(hashChild1, existing)).toBe(true);
    expect(isPinTaken(hashChild2, existing)).toBe(true);
  });

  it('returns false when candidate is unique within family hashes', () => {
    const existing = [hashParent, hashChild1, hashChild2];
    expect(isPinTaken(hashOther, existing)).toBe(false);
  });

  it('returns false when existingHashes list is empty', () => {
    expect(isPinTaken(hashParent, [])).toBe(false);
  });

  it('safely handles and filters null and undefined entries in existingHashes', () => {
    const existingWithNulls = [null, undefined, hashChild1, null];
    expect(isPinTaken(hashChild1, existingWithNulls)).toBe(true);
    expect(isPinTaken(hashParent, existingWithNulls)).toBe(false);
  });

  it('safely handles empty string or whitespace entries in existingHashes', () => {
    const existingWithEmpty = ['', '  ', null, hashChild2];
    expect(isPinTaken(hashChild2, existingWithEmpty)).toBe(true);
    expect(isPinTaken(hashParent, existingWithEmpty)).toBe(false);
  });

  it('returns false if candidateHash itself is empty or whitespace', () => {
    const existing = [hashParent, hashChild1];
    expect(isPinTaken('', existing)).toBe(false);
  });
});
