import { describe, it, expect } from 'vitest';
import { isValidPinFormat, hashPin } from './pinHash';

describe('pinHash utility', () => {
  describe('isValidPinFormat', () => {
    it('accepts valid 4-digit PINs', () => {
      expect(isValidPinFormat('1234')).toBe(true);
      expect(isValidPinFormat('0000')).toBe(true);
      expect(isValidPinFormat('9999')).toBe(true);
      expect(isValidPinFormat('0582')).toBe(true);
    });

    it('rejects invalid lengths', () => {
      expect(isValidPinFormat('')).toBe(false);
      expect(isValidPinFormat('1')).toBe(false);
      expect(isValidPinFormat('12')).toBe(false);
      expect(isValidPinFormat('123')).toBe(false);
      expect(isValidPinFormat('12345')).toBe(false);
      expect(isValidPinFormat('123456')).toBe(false);
    });

    it('rejects non-digit characters', () => {
      expect(isValidPinFormat('abcd')).toBe(false);
      expect(isValidPinFormat('12a4')).toBe(false);
      expect(isValidPinFormat('12 4')).toBe(false);
      expect(isValidPinFormat('12-4')).toBe(false);
      expect(isValidPinFormat('+123')).toBe(false);
      expect(isValidPinFormat(' 1234')).toBe(false);
      expect(isValidPinFormat('1234 ')).toBe(false);
      expect(isValidPinFormat('12.4')).toBe(false);
    });
  });

  describe('hashPin', () => {
    it('produces a lowercase hexadecimal string of exactly 64 characters', async () => {
      const hash = await hashPin('1234');
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('is deterministic for the same PIN', async () => {
      const hash1 = await hashPin('4321');
      const hash2 = await hashPin('4321');
      expect(hash1).toBe(hash2);
    });

    it('produces distinct hashes for different PINs', async () => {
      const hash1 = await hashPin('1111');
      const hash2 = await hashPin('2222');
      expect(hash1).not.toBe(hash2);
    });

    it('matches known SHA-256 test vector', async () => {
      // SHA-256("1234") = 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
      const hash = await hashPin('1234');
      expect(hash).toBe('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');

      // SHA-256("0000") = 9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0
      const hashZeros = await hashPin('0000');
      expect(hashZeros).toBe('9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0');
    });
  });
});
