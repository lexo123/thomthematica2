import { GameMode } from '../types';

export const KVESHMICERA_WISH_BLOCK_SIZE = 20;
export const DEFAULT_WISH_BLOCK_SIZE = 40;

/**
 * Returns the wish qualification block size for a given game mode.
 * Kveshmicera (column multiplication) requires a 20-question block.
 * All other game modes require a 40-question block.
 */
export function getWishBlockSize(gameMode: GameMode | string | null | undefined): number {
  if (gameMode === GameMode.Kveshmicera || gameMode === 'kveshmicera') {
    return KVESHMICERA_WISH_BLOCK_SIZE;
  }
  return DEFAULT_WISH_BLOCK_SIZE;
}

/**
 * Returns the minimum correct answers required to qualify for a wish in a block.
 * Formula: blockSize - 1 (e.g. 19 for 20-block, 39 for 40-block).
 */
export function getWishQualificationThreshold(blockSize: number): number {
  return Math.max(1, blockSize - 1);
}
