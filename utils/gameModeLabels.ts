import { GameMode } from '../types';

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  [GameMode.Thomthematica]: 'მაგალითები',
  [GameMode.ThomravlebisTabula]: 'გამრავლების ტაბულა',
  [GameMode.Gethometria]: 'გეომეტრია',
  [GameMode.Kveshmicera]: 'ქვეშმიწერით გამრავლება',
  [GameMode.Kveshdivision]: 'ქვეშმიწერით გაყოფა',
};

const isGameMode = (mode: string): mode is GameMode => {
  return Object.prototype.hasOwnProperty.call(GAME_MODE_LABELS, mode);
};

export const getGameModeLabel = (mode: string): string => {
  if (isGameMode(mode)) {
    return GAME_MODE_LABELS[mode];
  }
  return mode;
};
