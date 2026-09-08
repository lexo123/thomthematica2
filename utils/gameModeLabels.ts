import { GameMode } from '../types';

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  [GameMode.Thomthematica]: 'თომთემატიკა',
  [GameMode.ThomravlebisTabula]: 'თომრავლების ტაბულა',
  [GameMode.Gethometria]: 'გეთომეტრია',
  [GameMode.Kveshmicera]: 'ქვეშმიწერით გამრავლება',
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
