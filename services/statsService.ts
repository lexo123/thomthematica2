import { GameMode } from '../types';

export const DEFAULT_GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyh3gS70bV2SOdC-wNqUYtkhh4pw8wgeE3ywnJvbGZEuv83x-X9urjVX24O8l3MsZB62w/exec";
export const GOOGLE_SHEETS_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL || DEFAULT_GOOGLE_SHEETS_URL;

export interface GameStatsPayload {
  gameMode: string;
  totalQuestions: number;
  totalCorrect: number;
}

export interface WishPayload {
  wish: string;
  wishText: string;
  wish_text: string;
  Wish: string;
  WishText: string;
  correctCount: number;
  timestamp: string;
}

const getModeName = (mode: GameMode): string => {
  switch (mode) {
    case GameMode.Thomthematica:
      return 'თომთემატიკა';
    case GameMode.ThomravlebisTabula:
      return 'თომრავლების ტაბულა';
    case GameMode.Gethometria:
      return 'გეთომეტრია';
    case GameMode.Kveshmicera:
      return 'ქვეშმიწერით გამრავლება';
    default:
      return 'უცნობი რეჟიმი';
  }
};

/**
 * Sends accumulated game session statistics to Google Sheets.
 */
export const sendGameStats = (mode: GameMode, totalQuestions: number, totalCorrect: number): void => {
  if (totalQuestions <= 0 || !GOOGLE_SHEETS_URL) return;

  const modeName = getModeName(mode);
  const payload: GameStatsPayload = {
    gameMode: modeName,
    totalQuestions,
    totalCorrect
  };

  const jsonPayload = JSON.stringify(payload);

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([jsonPayload], { type: 'text/plain;charset=utf-8' });
    navigator.sendBeacon(GOOGLE_SHEETS_URL, blob);
  } else {
    fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: jsonPayload,
      keepalive: true
    }).catch(console.error);
  }
};

/**
 * Submits a user wish after completing 40 questions to Google Sheets.
 * Includes fallback fields for backward compatibility with Apps Script.
 */
export const sendWish = async (wishTextStr: string, correctCount: number): Promise<boolean> => {
  if (!wishTextStr.trim() || !GOOGLE_SHEETS_URL) return false;

  const payload: WishPayload = {
    wish: wishTextStr,
    wishText: wishTextStr,
    wish_text: wishTextStr,
    Wish: wishTextStr,
    WishText: wishTextStr,
    correctCount,
    timestamp: new Date().toISOString()
  };

  try {
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    console.error('Error sending wish:', err);
    return false;
  }
};
