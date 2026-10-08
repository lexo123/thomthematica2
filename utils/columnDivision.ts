export type DivisionCellKind = 'quotient' | 'product' | 'working' | 'final' | 'spare';
export type DivisionCellRule = 'required' | 'optional' | 'blank';

export interface DivisionCell {
  id: string; // უნიკალური, სტაბილური: მაგ. 'q-0', 'p-1-0', 'w-1-1', 'final', 's-0'
  kind: DivisionCellKind;
  step: number; // ნაბიჯის ინდექსი (final-ზე = ბოლო ნაბიჯი)
  row: 'quotient' | { stepRow: number; part: 'product' | 'working' } | 'final';
  col: number; // სვეტი (quotient-ისთვის: პოზიცია განაყოფში)
  expected: string; // ერთი ციფრი, ან '' spare უჯრისთვის
  rule: DivisionCellRule;
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

  const numSteps = e0 === 0 ? n : n - 1;
  const last = numSteps - 1;

  for (let step = 0; step < numSteps; step++) {
    const qDigit = Math.floor(W / divisor);
    const P = qDigit * divisor;
    const r = W - P;
    const e_i = e0 + step;
    const isLastStep = step === last;

    // 1. Quotient cell
    const qId = `q-${step}`;
    const qCell: DivisionCell = {
      id: qId,
      kind: 'quotient',
      step,
      row: 'quotient',
      col: step,
      expected: qDigit.toString(),
      rule: 'required',
    };
    cells.push(qCell);
    solvingSequence.push(qId);

    // If spare quotient cell is needed (numSteps < n, on last step)
    if (isLastStep && numSteps < n) {
      const spareCell: DivisionCell = {
        id: 's-0',
        kind: 'spare',
        step: last,
        row: 'quotient',
        col: numSteps,
        expected: '',
        rule: 'blank',
      };
      cells.push(spareCell);
      // NOTE: spare cell is intentionally NOT pushed to solvingSequence
    }

    // 2. Product cells
    if (step === 0 && e0 === 0) {
      // Step 0 with e0 === 0: single cell p-0-0
      const pId = `p-0-0`;
      const pCell: DivisionCell = {
        id: pId,
        kind: 'product',
        step: 0,
        row: { stepRow: 0, part: 'product' },
        col: 0,
        expected: P.toString(),
        rule: isLastStep ? 'optional' : 'required',
      };
      cells.push(pCell);
      solvingSequence.push(pId);
    } else {
      // All other steps: two cells p-i-0 (col e_i - 1) and p-i-1 (col e_i)
      const pId0 = `p-${step}-0`;
      const pId1 = `p-${step}-1`;

      if (P >= 10) {
        const pStr = P.toString();
        const pCell0: DivisionCell = {
          id: pId0,
          kind: 'product',
          step,
          row: { stepRow: step, part: 'product' },
          col: e_i - 1,
          expected: pStr[0],
          rule: isLastStep ? 'optional' : 'required',
        };
        const pCell1: DivisionCell = {
          id: pId1,
          kind: 'product',
          step,
          row: { stepRow: step, part: 'product' },
          col: e_i,
          expected: pStr[1],
          rule: isLastStep ? 'optional' : 'required',
        };
        cells.push(pCell0, pCell1);
      } else {
        // Single-digit product P < 10
        const pCell0: DivisionCell = {
          id: pId0,
          kind: 'product',
          step,
          row: { stepRow: step, part: 'product' },
          col: e_i - 1,
          expected: '0',
          rule: 'optional',
        };
        const pCell1: DivisionCell = {
          id: pId1,
          kind: 'product',
          step,
          row: { stepRow: step, part: 'product' },
          col: e_i,
          expected: P.toString(),
          rule: isLastStep ? 'optional' : 'required',
        };
        cells.push(pCell0, pCell1);
      }
      solvingSequence.push(pId0, pId1);
    }

    // 3. Working cells (if not last step)
    if (!isLastStep) {
      const broughtDownDigit = dividendDigits[nextDigitIdx];
      const wId0 = `w-${step}-0`;
      const wCell0: DivisionCell = {
        id: wId0,
        kind: 'working',
        step,
        row: { stepRow: step, part: 'working' },
        col: e_i,
        expected: r.toString(),
        rule: r === 0 ? 'optional' : 'required',
      };

      const wId1 = `w-${step}-1`;
      const wCell1: DivisionCell = {
        id: wId1,
        kind: 'working',
        step,
        row: { stepRow: step, part: 'working' },
        col: e_i + 1,
        expected: broughtDownDigit,
        rule: 'required',
      };

      cells.push(wCell0, wCell1);
      solvingSequence.push(wId0, wId1);

      W = r * 10 + Number(broughtDownDigit);
      nextDigitIdx++;
    } else {
      // Last step: remainder must be 0, record final '0' cell
      const finalId = 'final';
      const finalCell: DivisionCell = {
        id: finalId,
        kind: 'final',
        step: last,
        row: 'final',
        col: n - 1,
        expected: '0',
        rule: 'optional',
      };
      cells.push(finalCell);
      solvingSequence.push(finalId);
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
 * Rule-based evaluation:
 * - 'required': empty -> 'empty' (invalid), match -> 'correct', mismatch -> 'wrong'
 * - 'optional': empty -> 'correct', match -> 'correct', mismatch -> 'wrong'
 * - 'blank': empty -> 'correct', non-empty -> 'wrong'
 */
export function validateDivisionAnswers(
  layout: DivisionLayout,
  answers: Record<string, string>
): { statuses: Record<string, CellStatus>; isAllCorrect: boolean } {
  const statuses: Record<string, CellStatus> = {};
  let isAllCorrect = true;

  for (const cell of layout.cells) {
    const rawVal = answers[cell.id];
    const isEmpty = rawVal === undefined || rawVal === null || rawVal === '';

    if (cell.rule === 'required') {
      if (isEmpty) {
        statuses[cell.id] = 'empty';
        isAllCorrect = false;
      } else if (rawVal === cell.expected) {
        statuses[cell.id] = 'correct';
      } else {
        statuses[cell.id] = 'wrong';
        isAllCorrect = false;
      }
    } else if (cell.rule === 'optional') {
      if (isEmpty) {
        statuses[cell.id] = 'correct';
      } else if (rawVal === cell.expected) {
        statuses[cell.id] = 'correct';
      } else {
        statuses[cell.id] = 'wrong';
        isAllCorrect = false;
      }
    } else if (cell.rule === 'blank') {
      if (isEmpty) {
        statuses[cell.id] = 'correct';
      } else {
        statuses[cell.id] = 'wrong';
        isAllCorrect = false;
      }
    }
  }

  return {
    statuses,
    isAllCorrect,
  };
}
