export type DivisionCellKind = 'quotient' | 'product' | 'working' | 'final';

export interface DivisionCell {
  id: string; // უნიკალური, სტაბილური: მაგ. 'q-0', 'p-1-0', 'w-1-1', 'final'
  kind: DivisionCellKind;
  step: number; // ნაბიჯის ინდექსი (final-ზე = ბოლო ნაბიჯი)
  row: 'quotient' | { stepRow: number; part: 'product' | 'working' } | 'final';
  col: number; // სვეტი (quotient-ისთვის: პოზიცია განაყოფში)
  expected: string; // ერთი ციფრი
}

export interface DivisionLayout {
  dividend: number;
  divisor: number;
  quotient: number;
  dividendDigits: string[];
  cells: DivisionCell[];
  solvingSequence: string[]; // cell id-ები შეყვანის თანმიმდევრობით
}

export type CellStatus = 'correct' | 'wrong' | 'empty';

/**
 * Builds column division layout structure for 3 or 4-digit dividend and single-digit divisor (2-9),
 * with exact division (no remainder).
 */
export function buildDivisionLayout(dividend: number, divisor: number): DivisionLayout {
  if (!Number.isInteger(dividend) || dividend < 100 || dividend > 9999) {
    throw new Error(`Invalid dividend: ${dividend}. Must be an integer between 100 and 9999.`);
  }

  if (!Number.isInteger(divisor) || divisor < 2 || divisor > 9) {
    throw new Error(`Invalid divisor: ${divisor}. Must be an integer between 2 and 9.`);
  }

  if (dividend % divisor !== 0) {
    throw new Error(`Dividend ${dividend} is not evenly divisible by divisor ${divisor}.`);
  }

  const quotient = dividend / divisor;
  const dividendStr = dividend.toString();
  const dividendDigits = dividendStr.split('');
  const n = dividendDigits.length;

  const cells: DivisionCell[] = [];
  const solvingSequence: string[] = [];

  // Step 0: Initial working number W
  let W: number;
  let nextDigitIdx: number;
  let e0: number;

  const d0 = Number(dividendDigits[0]);
  if (d0 >= divisor) {
    W = d0;
    nextDigitIdx = 1;
    e0 = 0;
  } else {
    W = d0 * 10 + Number(dividendDigits[1]);
    nextDigitIdx = 2;
    e0 = 1;
  }

  let step = 0;

  while (true) {
    const qDigit = Math.floor(W / divisor);
    const P = qDigit * divisor;
    const r = W - P;
    const e_i = e0 + step;

    // 1. Quotient cell
    const qId = `q-${step}`;
    const qCell: DivisionCell = {
      id: qId,
      kind: 'quotient',
      step,
      row: 'quotient',
      col: step,
      expected: qDigit.toString(),
    };
    cells.push(qCell);
    solvingSequence.push(qId);

    // 2. Product cells (digits of P, right-aligned at e_i)
    const pStr = P.toString();
    const pStartCol = e_i - pStr.length + 1;
    for (let digitIdx = 0; digitIdx < pStr.length; digitIdx++) {
      const pId = `p-${step}-${digitIdx}`;
      const pCell: DivisionCell = {
        id: pId,
        kind: 'product',
        step,
        row: { stepRow: step, part: 'product' },
        col: pStartCol + digitIdx,
        expected: pStr[digitIdx],
      };
      cells.push(pCell);
      solvingSequence.push(pId);
    }

    // 3. Working cells (if more digits remain to be brought down)
    if (nextDigitIdx < n) {
      const broughtDownDigit = dividendDigits[nextDigitIdx];
      const broughtDownCol = e_i + 1;

      if (r === 0) {
        // Only 1 cell: brought down digit
        const wId = `w-${step}-0`;
        const wCell: DivisionCell = {
          id: wId,
          kind: 'working',
          step,
          row: { stepRow: step, part: 'working' },
          col: broughtDownCol,
          expected: broughtDownDigit,
        };
        cells.push(wCell);
        solvingSequence.push(wId);
      } else {
        // 2 cells: remainder r at broughtDownCol - 1, and brought down digit at broughtDownCol
        const wId0 = `w-${step}-0`;
        const wCell0: DivisionCell = {
          id: wId0,
          kind: 'working',
          step,
          row: { stepRow: step, part: 'working' },
          col: broughtDownCol - 1,
          expected: r.toString(),
        };
        cells.push(wCell0);
        solvingSequence.push(wId0);

        const wId1 = `w-${step}-1`;
        const wCell1: DivisionCell = {
          id: wId1,
          kind: 'working',
          step,
          row: { stepRow: step, part: 'working' },
          col: broughtDownCol,
          expected: broughtDownDigit,
        };
        cells.push(wCell1);
        solvingSequence.push(wId1);
      }

      W = r * 10 + Number(broughtDownDigit);
      nextDigitIdx++;
      step++;
    } else {
      // Last step: r must be 0, record final '0' cell
      const finalId = 'final';
      const finalCell: DivisionCell = {
        id: finalId,
        kind: 'final',
        step,
        row: 'final',
        col: e_i,
        expected: '0',
      };
      cells.push(finalCell);
      solvingSequence.push(finalId);
      break;
    }
  }

  return {
    dividend,
    divisor,
    quotient,
    dividendDigits,
    cells,
    solvingSequence,
  };
}

/**
 * Validates user answers against expected layout digits.
 * Empty answers are considered 'empty' and cause isAllCorrect to be false.
 */
export function validateDivisionAnswers(
  layout: DivisionLayout,
  answers: Record<string, string>
): { statuses: Record<string, CellStatus>; isAllCorrect: boolean } {
  const statuses: Record<string, CellStatus> = {};
  let isAllCorrect = true;

  for (const cell of layout.cells) {
    const rawVal = answers[cell.id];
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      statuses[cell.id] = 'empty';
      isAllCorrect = false;
    } else if (rawVal === cell.expected) {
      statuses[cell.id] = 'correct';
    } else {
      statuses[cell.id] = 'wrong';
      isAllCorrect = false;
    }
  }

  return {
    statuses,
    isAllCorrect,
  };
}
