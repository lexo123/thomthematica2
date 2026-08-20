import React from 'react';
import { GameMode, GameState } from '../types';

interface HeaderProps {
  gameMode: GameMode;
  gameState: GameState;
  timeLeft: number;
  questionsInBlock: number;
  totalCorrect: number;
  totalQuestions: number;
  onHomeClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gameMode,
  gameState,
  timeLeft,
  questionsInBlock,
  totalCorrect,
  totalQuestions,
  onHomeClick,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full max-w-2xl p-2.5 sm:p-4 text-center flex flex-row justify-between px-3 sm:px-6 items-center gap-2 bg-indigo-100/95 backdrop-blur-md border-b border-indigo-200/80 shadow-md rounded-2xl mb-2 sm:mb-4">
      <div className="flex items-center gap-2 sm:gap-3 order-1 shrink min-w-0">
        <button 
          onClick={onHomeClick}
          className="bg-white/80 p-2 rounded-xl hover:bg-white transition-colors border border-indigo-100 text-indigo-900 shadow-sm text-base sm:text-lg flex items-center justify-center shrink-0"
          title="მთავარი მენიუ"
        >
          🏠
        </button>
        <h1 className="text-xs sm:text-lg md:text-2xl font-black text-indigo-900 tracking-tight truncate">
          {gameMode === GameMode.Thomthematica ? 'თომთემატიკა 👑' : 
           gameMode === GameMode.ThomravlebisTabula ? 'თომრავლების ტაბულა ✖️' : 
           gameMode === GameMode.Gethometria ? 'გეთომეტრია 📐' : 'ქვეშმიწერით გამრავლება ✍️'}
        </h1>
      </div>
      
      {/* ქულების პანელი */}
      <div className="flex gap-1 sm:gap-2 order-2 shrink-0">
        {gameMode === GameMode.ThomravlebisTabula && gameState === GameState.Playing && (
          <div className={`text-white font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl shadow-sm text-xs sm:text-sm flex flex-col items-center min-w-[50px] sm:min-w-[70px] transition-colors ${timeLeft <= 3 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
            <span className="text-[9px] sm:text-[10px] uppercase opacity-90">დრო</span>
            <span className="font-black text-xs sm:text-sm">{timeLeft}წმ</span>
          </div>
        )}
        <div className="text-indigo-800 font-bold bg-white/80 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl shadow-sm text-xs sm:text-sm border border-indigo-100 flex flex-col items-center min-w-[55px] sm:min-w-[75px]">
          <span className="text-[9px] sm:text-[10px] uppercase opacity-60">ბლოკი</span>
          <span className="text-indigo-600 font-black text-xs sm:text-sm">{questionsInBlock}/3</span>
        </div>
        <div className="text-green-800 font-bold bg-white/80 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl shadow-sm text-xs sm:text-sm border border-green-100 flex flex-col items-center min-w-[75px] sm:min-w-[95px]">
          <span className="text-[9px] sm:text-[10px] uppercase opacity-60">ჯამური ქულა</span>
          <span className="text-green-600 font-black text-xs sm:text-sm">{totalCorrect}/{totalQuestions}</span>
        </div>
      </div>
    </header>
  );
};
