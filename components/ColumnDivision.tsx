import React from 'react';
import { DivisionLayout, DivisionCell, validateDivisionAnswers } from '../utils/columnDivision';
import { Button } from './Button';

export interface ColumnDivisionProps {
  layout: DivisionLayout;
  answers: Record<string, string>;
  showValidation: boolean;
  currentMessage: string;
  onCellChange: (id: string, val: string) => void;
  onKeyDown: (id: string, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isFilled: () => boolean;
  registerCellRef?: (id: string, el: HTMLInputElement | null) => void;
}

/**
 * Calculates the exact gridRow and gridColumn for each division cell
 * based on its kind, step, and col index.
 */
export const getDivisionCellGridPosition = (
  cell: DivisionCell,
  dividendDigitsCount: number
): { gridRow: number; gridColumn: number } => {
  const n = dividendDigitsCount;
  if (cell.kind === 'quotient' || cell.kind === 'spare') {
    return {
      gridRow: 2,
      gridColumn: n + 3 + cell.col,
    };
  }
  if (cell.kind === 'product') {
    return {
      gridRow: 2 + 3 * cell.step,
      gridColumn: cell.col + 2,
    };
  }
  if (cell.kind === 'working' || cell.kind === 'final') {
    return {
      gridRow: 4 + 3 * cell.step,
      gridColumn: cell.col + 2,
    };
  }
  return { gridRow: 1, gridColumn: 1 };
};

export const ColumnDivision: React.FC<ColumnDivisionProps> = ({
  layout,
  answers,
  showValidation,
  currentMessage,
  onCellChange,
  onKeyDown,
  onSubmit,
  isFilled,
  registerCellRef,
}) => {
  if (!layout) {
    return null;
  }

  const n = layout.dividendDigits.length;
  const qLen = n;
  const maxStep = Math.max(...layout.cells.map((c) => c.step));
  const maxRows = 4 + 3 * maxStep;

  // Distinct steps present in product cells
  const stepIndices: number[] = Array.from(
    new Set<number>(layout.cells.filter((c) => c.kind === 'product').map((c) => c.step))
  ).sort((a: number, b: number) => a - b);

  const { statuses } = validateDivisionAnswers(layout, answers);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <p className="text-gray-500 font-medium uppercase tracking-wider text-sm mb-2">
        შეავსე ქვეშმიწერით გაყოფა!
      </p>

      {showValidation && (
        <div className="w-full max-w-sm mb-4 bg-rose-50 border border-rose-200 text-rose-700 font-bold px-4 py-3 rounded-2xl text-center shadow-sm animate-pulse text-base">
          {currentMessage || 'ზოგიერთი ციფრი არასწორია! შეასწორე წითელი უჯრები.'}
        </div>
      )}

      <div className="max-w-full overflow-x-auto p-2 md:p-6 bg-indigo-50/55 rounded-3xl border border-indigo-100 flex flex-col items-center justify-center">
        <div
          className="inline-grid gap-1 md:gap-2 font-mono items-center font-extrabold text-indigo-950"
          style={{
            gridTemplateColumns: `auto repeat(${n}, auto) auto repeat(${qLen}, auto)`,
          }}
        >
          {/* 1. Static dividend digits (Row 1, columns 2 .. n+1) */}
          {layout.dividendDigits.map((digit, colIdx) => (
            <div
              key={`dividend-${colIdx}`}
              style={{ gridRow: 1, gridColumn: colIdx + 2 }}
              className="w-8 h-9 text-xl md:w-12 md:h-14 md:text-3xl flex items-center justify-center font-black text-indigo-900 select-none"
            >
              {digit}
            </div>
          ))}

          {/* 2. Static divisor (Row 1, column n+3) */}
          <div
            style={{ gridRow: 1, gridColumn: n + 3 }}
            className="w-8 h-9 text-xl md:w-12 md:h-14 md:text-3xl flex items-center justify-center font-black text-indigo-900 select-none"
          >
            {layout.divisor}
          </div>

          {/* 3. Horizontal line under divisor across quotient columns (Row 1, columns n+3 .. n+3+qLen) */}
          <div
            style={{
              gridRow: 1,
              gridColumn: `${n + 3} / ${n + 3 + qLen}`,
            }}
            className="border-b-2 border-indigo-900/60 pointer-events-none self-end"
          />

          {/* 4. Vertical divider line separating dividend and divisor/quotient (column n+2) */}
          <div
            style={{
              gridRow: `1 / ${maxRows + 1}`,
              gridColumn: n + 2,
            }}
            className="w-[2px] bg-indigo-900/60 rounded-full justify-self-center my-0.5"
          />

          {/* 5. Static minus sign and subtraction line for each step */}
          {stepIndices.map((s) => (
            <React.Fragment key={`step-decorations-${s}`}>
              {/* Minus sign at row 2 + 3*s, column 1 */}
              <div
                style={{ gridRow: 2 + 3 * s, gridColumn: 1 }}
                className="w-4 md:w-6 flex items-center justify-center text-amber-600 font-extrabold text-xl md:text-3xl select-none"
              >
                -
              </div>

              {/* Subtraction line at row 3 + 3*s, spanning columns 2 .. n+2 */}
              <div
                style={{
                  gridRow: 3 + 3 * s,
                  gridColumn: `2 / ${n + 2}`,
                }}
                className="h-[2px] bg-indigo-900/60 rounded-full self-center"
              />
            </React.Fragment>
          ))}

          {/* 6. Interactive input cells */}
          {layout.cells.map((cell) => {
            const { gridRow, gridColumn } = getDivisionCellGridPosition(cell, n);

            const neutralClass =
              'bg-white border-indigo-200 focus:border-amber-400 focus:ring-amber-200 text-indigo-900';
            const correctClass =
              'bg-emerald-50 border-emerald-500 text-emerald-950 focus:border-emerald-600 focus:ring-emerald-200';
            const wrongClass =
              'bg-rose-50 border-rose-500 text-rose-950 focus:border-rose-600 focus:ring-rose-200';

            let cellClass = neutralClass;
            if (showValidation) {
              const status = statuses[cell.id];
              const rawVal = answers[cell.id];
              const isEmpty = rawVal === undefined || rawVal === null || rawVal === '';

              if (status === 'correct') {
                if (isEmpty && cell.rule !== 'required') {
                  cellClass = neutralClass;
                } else {
                  cellClass = correctClass;
                }
              } else {
                cellClass = wrongClass;
              }
            }

            return (
              <input
                key={cell.id}
                id={`cell-${cell.id}`}
                data-cell-id={cell.id}
                data-testid={cell.id}
                ref={(el) => registerCellRef?.(cell.id, el)}
                type="tel"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={1}
                placeholder="?"
                value={answers[cell.id] || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => onCellChange(cell.id, e.target.value)}
                onKeyDown={(e) => onKeyDown(cell.id, e)}
                style={{ gridRow, gridColumn }}
                className={`w-8 h-9 text-xl md:w-12 md:h-14 md:text-3xl rounded-lg md:rounded-xl border-2 font-black text-center outline-none transition-all shadow-sm ${cellClass}`}
              />
            );
          })}
        </div>
      </div>

      <form onSubmit={onSubmit} className="w-full max-w-xs mt-6">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isFilled()}
        >
          შემოწმება 🚀
        </Button>
      </form>
    </div>
  );
};
