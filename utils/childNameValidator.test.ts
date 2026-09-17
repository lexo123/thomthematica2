import { describe, it, expect } from 'vitest';
import { isValidChildName } from './childNameValidator';

describe('isValidChildName', () => {
  describe('Prompt reference test cases', () => {
    it('accepts single standard Georgian name: "გიორგი"', () => {
      expect(isValidChildName('გიორგი')).toBe(true);
    });

    it('accepts hyphenated Georgian name: "ანა-მარი"', () => {
      expect(isValidChildName('ანა-მარი')).toBe(true);
    });

    it('accepts space-separated Georgian name: "ნინო მარი"', () => {
      expect(isValidChildName('ნინო მარი')).toBe(true);
    });

    it('accepts multi-part Georgian name with hyphen and space: "ანა-მარი ქეთევანი"', () => {
      expect(isValidChildName('ანა-მარი ქეთევანი')).toBe(true);
    });

    it('rejects leading hyphen: "-ანა"', () => {
      expect(isValidChildName('-ანა')).toBe(false);
    });

    it('rejects trailing hyphen: "ანა-"', () => {
      expect(isValidChildName('ანა-')).toBe(false);
    });

    it('rejects consecutive hyphens: "ანა--მარი"', () => {
      expect(isValidChildName('ანა--მარი')).toBe(false);
    });

    it('rejects consecutive spaces: "ანა  მარი"', () => {
      expect(isValidChildName('ანა  მარი')).toBe(false);
    });

    it('rejects consecutive space and hyphen: "ანა -მარი"', () => {
      expect(isValidChildName('ანა -მარი')).toBe(false);
    });

    it('rejects digits: "ანა1"', () => {
      expect(isValidChildName('ანა1')).toBe(false);
    });

    it('rejects Latin characters: "Anna"', () => {
      expect(isValidChildName('Anna')).toBe(false);
    });

    it('rejects punctuation other than hyphen: "ანა."', () => {
      expect(isValidChildName('ანა.')).toBe(false);
    });

    it('rejects empty string: ""', () => {
      expect(isValidChildName('')).toBe(false);
    });
  });

  describe('Additional edge cases and syntactic constraints', () => {
    it('rejects consecutive hyphen then space: "ანა- მარი"', () => {
      expect(isValidChildName('ანა- მარი')).toBe(false);
    });

    it('accepts valid 2-letter Georgian name: "ია"', () => {
      expect(isValidChildName('ია')).toBe(true);
    });

    it('rejects single character: "ა"', () => {
      expect(isValidChildName('ა')).toBe(false);
    });

    it('rejects leading space: " ანა"', () => {
      expect(isValidChildName(' ანა')).toBe(false);
    });

    it('rejects trailing space: "ანა "', () => {
      expect(isValidChildName('ანა ')).toBe(false);
    });

    it('rejects names with punctuation like commas, underscores, exclamation marks', () => {
      expect(isValidChildName('ანა_მარი')).toBe(false);
      expect(isValidChildName('ანა, მარი')).toBe(false);
      expect(isValidChildName('ანა!')).toBe(false);
      expect(isValidChildName('თომა?')).toBe(false);
    });

    it('rejects emojis and symbols', () => {
      expect(isValidChildName('ანა🌸')).toBe(false);
      expect(isValidChildName('🎮თომა')).toBe(false);
      expect(isValidChildName('თომა 🌟')).toBe(false);
    });

    it('rejects Cyrillic and other non-Georgian Unicode ranges', () => {
      expect(isValidChildName('Анна')).toBe(false);
      expect(isValidChildName('Мария')).toBe(false);
    });

    it('rejects digits anywhere inside name', () => {
      expect(isValidChildName('თ1ომა')).toBe(false);
      expect(isValidChildName('2თომა')).toBe(false);
    });
  });
});
