import { describe, it, expect } from 'vitest';
import { GameMode } from '../types';
import { GAME_MODE_LABELS, getGameModeLabel } from './gameModeLabels';

describe('gameModeLabels util', () => {
  it('returns the correct label for all known GameMode values', () => {
    expect(getGameModeLabel(GameMode.Thomthematica)).toBe('თომთემატიკა');
    expect(getGameModeLabel(GameMode.ThomravlebisTabula)).toBe('თომრავლების ტაბულა');
    expect(getGameModeLabel(GameMode.Gethometria)).toBe('გეთომეტრია');
    expect(getGameModeLabel(GameMode.Kveshmicera)).toBe('ქვეშმიწერით გამრავლება');

    // Also check direct string value of enum
    expect(getGameModeLabel('thomthematica')).toBe('თომთემატიკა');
    expect(getGameModeLabel('thomravlebis_tabula')).toBe('თომრავლების ტაბულა');
    expect(getGameModeLabel('gethometria')).toBe('გეთომეტრია');
    expect(getGameModeLabel('kveshmicera')).toBe('ქვეშმიწერით გამრავლება');
  });

  it('returns input string untouched for unknown or legacy mode strings', () => {
    expect(getGameModeLabel('unknown_mode')).toBe('unknown_mode');
    expect(getGameModeLabel('custom_game_123')).toBe('custom_game_123');
    expect(getGameModeLabel('')).toBe('');
  });

  it('exports GAME_MODE_LABELS as a Record covering all GameModes', () => {
    expect(GAME_MODE_LABELS[GameMode.Thomthematica]).toBe('თომთემატიკა');
    expect(GAME_MODE_LABELS[GameMode.ThomravlebisTabula]).toBe('თომრავლების ტაბულა');
    expect(GAME_MODE_LABELS[GameMode.Gethometria]).toBe('გეთომეტრია');
    expect(GAME_MODE_LABELS[GameMode.Kveshmicera]).toBe('ქვეშმიწერით გამრავლება');
  });
});
