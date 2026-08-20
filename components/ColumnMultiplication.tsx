import React from 'react';
import { MathProblem, ColMultState } from '../types';
import { Button } from './Button';

interface ColumnMultiplicationProps {
  problem: MathProblem;
  colMultState: ColMultState;
  showKveshValidation: boolean;
  currentMessage: string;
  onCellChange: (row: 'r1' | 'r2' | 'res', colIndex: number, val: string) => void;
  onKeyDown: (row: 'r1' | 'r2' | 'res', colIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  getExpectedDigits: (num1: number, num2: number) => { r1: string[]; r2: string[]; res: string[] };
  onSubmit: (e?: React.FormEvent) => void;
  isColMultFilled: () => boolean;
  registerCellRef?: (row: string, colIndex: number, el: HTMLInputElement | null) => void;
}

export const ColumnMultiplication: React.FC<ColumnMultiplicationProps> = ({
  problem,
  colMultState,
  showKveshValidation,
  currentMessage,
  onCellChange,
  onKeyDown,
  getExpectedDigits,
  onSubmit,
  isColMultFilled,
  registerCellRef,
}) => {
  if (!('num1' in problem) || problem.num1 === undefined || problem.num2 === undefined) {
    return null;
  }

  const expectedDigits = getExpectedDigits(problem.num1, problem.num2);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <p className="text-gray-500 font-medium uppercase tracking-wider text-sm mb-2">
        შეავსე ქვეშმიწერით გამრავლება!
      </p>

      {showKveshValidation && (
        <div className="w-full max-w-sm mb-4 bg-rose-50 border border-rose-200 text-rose-700 font-bold px-4 py-3 rounded-2xl text-center shadow-sm animate-pulse text-base">
          {currentMessage || "ზოგიერთი ციფრი არასწორია! შეასწორე წითელი უჯრები."}
        </div>
      )}
      
      <div className="inline-grid grid-cols-5 gap-2 md:gap-4 font-mono items-center text-2xl md:text-4xl font-extrabold text-indigo-950 p-6 md:p-8 bg-indigo-50/55 rounded-3xl border border-indigo-100">
        {/* Row 1: num1 (e.g. 24) */}
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center"></div>
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center"></div>
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center"></div>
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-indigo-800 font-black">
          {Math.floor(problem.num1 / 10)}
        </div>
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-indigo-800 font-black">
          {problem.num1 % 10}
        </div>

        {/* Row 2: num2 (e.g. 66) */}
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-amber-600 font-extrabold text-3xl md:text-5xl">
          ×
        </div>
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center"></div>
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center"></div>
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-indigo-800 font-black">
          {Math.floor(problem.num2 / 10)}
        </div>
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-indigo-800 font-black">
          {problem.num2 % 10}
        </div>

        {/* Line 1 */}
        <div className="col-span-5 h-[4px] bg-indigo-900/60 my-1 rounded-full" />

        {/* Row 3: First partial product row (r1) */}
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center"></div>
        {[0, 1, 2, 3].map((idx) => {
          const expected = expectedDigits.r1[idx];
          let cellBgColorClass = "bg-white border-indigo-200 focus:border-amber-400 focus:ring-amber-200 text-indigo-900";
          if (showKveshValidation) {
            const userVal = colMultState.r1[idx];
            if (userVal === expected) {
              cellBgColorClass = "bg-emerald-50 border-emerald-500 text-emerald-950 focus:border-emerald-600 focus:ring-emerald-200";
            } else {
              cellBgColorClass = "bg-rose-50 border-rose-500 text-rose-950 focus:border-rose-600 focus:ring-rose-200";
            }
          }

          return (
            <input
              key={idx}
              ref={(el) => registerCellRef?.('r1', idx, el)}
              id={`cell-r1-${idx}`}
              type="tel"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={1}
              value={colMultState.r1[idx]}
              onChange={(e) => onCellChange('r1', idx, e.target.value)}
              onKeyDown={(e) => onKeyDown('r1', idx, e)}
              onFocus={(e) => e.target.select()}
              className={`w-10 h-10 md:w-14 md:h-14 text-center rounded-2xl border-2 md:border-4 font-mono font-black outline-none transition-all placeholder-indigo-100 placeholder-opacity-50 ${cellBgColorClass}`}
              placeholder="?"
            />
          );
        })}

        {/* Row 4: Second partial product row (r2) */}
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-amber-600 font-black text-3xl md:text-5xl">
          +
        </div>
        {[0, 1, 2, 3].map((idx) => {
          const expected = expectedDigits.r2[idx];
          let cellBgColorClass = "bg-white border-indigo-200 focus:border-amber-400 focus:ring-amber-200 text-indigo-900";
          if (showKveshValidation) {
            const userVal = colMultState.r2[idx];
            if (userVal === expected) {
              cellBgColorClass = "bg-emerald-50 border-emerald-500 text-emerald-950 focus:border-emerald-600 focus:ring-emerald-200";
            } else {
              cellBgColorClass = "bg-rose-50 border-rose-500 text-rose-950 focus:border-rose-600 focus:ring-rose-200";
            }
          }

          return (
            <input
              key={idx}
              ref={(el) => registerCellRef?.('r2', idx, el)}
              id={`cell-r2-${idx}`}
              type="tel"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={1}
              value={colMultState.r2[idx]}
              onChange={(e) => onCellChange('r2', idx, e.target.value)}
              onKeyDown={(e) => onKeyDown('r2', idx, e)}
              onFocus={(e) => e.target.select()}
              className={`w-10 h-10 md:w-14 md:h-14 text-center rounded-2xl border-2 md:border-4 font-mono font-black outline-none transition-all placeholder-indigo-100 placeholder-opacity-50 ${cellBgColorClass}`}
              placeholder="?"
            />
          );
        })}

        {/* Line 2 */}
        <div className="col-span-5 h-[4px] bg-indigo-900/60 my-1 rounded-full" />

        {/* Row 5: Final sum row (res) */}
        <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center"></div>
        {[0, 1, 2, 3].map((idx) => {
          const expected = expectedDigits.res[idx];
          let cellBgColorClass = "bg-white border-indigo-200 focus:border-amber-400 focus:ring-amber-200 text-indigo-900";
          if (showKveshValidation) {
            const userVal = colMultState.res[idx];
            if (userVal === expected) {
              cellBgColorClass = "bg-emerald-50 border-emerald-500 text-emerald-950 focus:border-emerald-600 focus:ring-emerald-200";
            } else {
              cellBgColorClass = "bg-rose-50 border-rose-500 text-rose-950 focus:border-rose-600 focus:ring-rose-200";
            }
          }

          return (
            <input
              key={idx}
              ref={(el) => registerCellRef?.('res', idx, el)}
              id={`cell-res-${idx}`}
              type="tel"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={1}
              value={colMultState.res[idx]}
              onChange={(e) => onCellChange('res', idx, e.target.value)}
              onKeyDown={(e) => onKeyDown('res', idx, e)}
              onFocus={(e) => e.target.select()}
              className={`w-10 h-10 md:w-14 md:h-14 text-center rounded-2xl border-2 md:border-4 font-mono font-black outline-none transition-all placeholder-indigo-100 placeholder-opacity-50 ${cellBgColorClass}`}
              placeholder="?"
            />
          );
        })}
      </div>

      {/* Submit Button Block */}
      <form onSubmit={onSubmit} className="w-full mt-8">
        <Button 
          type="submit" 
          variant="primary" 
          size="lg" 
          fullWidth
          disabled={!isColMultFilled()}
        >
          შემოწმება 🚀
        </Button>
      </form>
    </div>
  );
};
