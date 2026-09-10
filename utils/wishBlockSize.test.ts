import { describe, it, expect } from 'vitest';
import { GameMode } from '../types';
import {
  getWishBlockSize,
  getWishQualificationThreshold,
  KVESHMICERA_WISH_BLOCK_SIZE,
  DEFAULT_WISH_BLOCK_SIZE,
} from './wishBlockSize';

describe('wishBlockSize utils', () => {
  it('returns 20 for GameMode.Kveshmicera', () => {
    expect(getWishBlockSize(GameMode.Kveshmicera)).toBe(20);
    expect(getWishBlockSize('kveshmicera')).toBe(20);
  });

  it('returns 40 for all other game modes', () => {
    expect(getWishBlockSize(GameMode.Thomthematica)).toBe(40);
    expect(getWishBlockSize(GameMode.ThomravlebisTabula)).toBe(40);
    expect(getWishBlockSize(GameMode.Gethometria)).toBe(40);
    expect(getWishBlockSize('mitvla')).toBe(40);
    expect(getWishBlockSize('sedareba')).toBe(40);
    expect(getWishBlockSize('pitagora')).toBe(40);
  });

  it('returns 40 default when mode is null or undefined', () => {
    expect(getWishBlockSize(null)).toBe(40);
    expect(getWishBlockSize(undefined)).toBe(40);
    expect(getWishBlockSize('')).toBe(40);
  });

  it('calculates threshold as blockSize - 1', () => {
    expect(getWishQualificationThreshold(KVESHMICERA_WISH_BLOCK_SIZE)).toBe(19);
    expect(getWishQualificationThreshold(DEFAULT_WISH_BLOCK_SIZE)).toBe(39);
  });
});
