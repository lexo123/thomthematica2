import { describe, it, expect } from 'vitest';
import {
  buildDivisionLayout,
  validateDivisionAnswers,
  DivisionLayout,
} from './columnDivision';

describe('columnDivision', () => {
  describe('Golden fixtures (§3 examples)', () => {
    it('fixture 1: 345 ÷ 3 = 115 (11 cells)', () => {
      const layout = buildDivisionLayout(345, 3);

      expect(layout.dividend).toBe(345);
      expect(layout.divisor).toBe(3);
      expect(layout.quotient).toBe(115);
      expect(layout.dividendDigits).toEqual(['3', '4', '5']);
      expect(layout.cells).toHaveLength(11);
      expect(layout.solvingSequence).toHaveLength(11);

      expect(layout.cells).toEqual([
        { id: 'q-0', kind: 'quotient', step: 0, row: 'quotient', col: 0, expected: '1' },
        { id: 'p-0-0', kind: 'product', step: 0, row: { stepRow: 0, part: 'product' }, col: 0, expected: '3' },
        { id: 'w-0-0', kind: 'working', step: 0, row: { stepRow: 0, part: 'working' }, col: 1, expected: '4' },
        { id: 'q-1', kind: 'quotient', step: 1, row: 'quotient', col: 1, expected: '1' },
        { id: 'p-1-0', kind: 'product', step: 1, row: { stepRow: 1, part: 'product' }, col: 1, expected: '3' },
        { id: 'w-1-0', kind: 'working', step: 1, row: { stepRow: 1, part: 'working' }, col: 1, expected: '1' },
        { id: 'w-1-1', kind: 'working', step: 1, row: { stepRow: 1, part: 'working' }, col: 2, expected: '5' },
        { id: 'q-2', kind: 'quotient', step: 2, row: 'quotient', col: 2, expected: '5' },
        { id: 'p-2-0', kind: 'product', step: 2, row: { stepRow: 2, part: 'product' }, col: 1, expected: '1' },
        { id: 'p-2-1', kind: 'product', step: 2, row: { stepRow: 2, part: 'product' }, col: 2, expected: '5' },
        { id: 'final', kind: 'final', step: 2, row: 'final', col: 2, expected: '0' },
      ]);

      expect(layout.solvingSequence).toEqual([
        'q-0',
        'p-0-0',
        'w-0-0',
        'q-1',
        'p-1-0',
        'w-1-0',
        'w-1-1',
        'q-2',
        'p-2-0',
        'p-2-1',
        'final',
      ]);
    });

    it('fixture 2: 612 ÷ 6 = 102 (11 cells, with quotient 0)', () => {
      const layout = buildDivisionLayout(612, 6);

      expect(layout.dividend).toBe(612);
      expect(layout.divisor).toBe(6);
      expect(layout.quotient).toBe(102);
      expect(layout.dividendDigits).toEqual(['6', '1', '2']);
      expect(layout.cells).toHaveLength(11);
      expect(layout.solvingSequence).toHaveLength(11);

      expect(layout.cells).toEqual([
        { id: 'q-0', kind: 'quotient', step: 0, row: 'quotient', col: 0, expected: '1' },
        { id: 'p-0-0', kind: 'product', step: 0, row: { stepRow: 0, part: 'product' }, col: 0, expected: '6' },
        { id: 'w-0-0', kind: 'working', step: 0, row: { stepRow: 0, part: 'working' }, col: 1, expected: '1' },
        { id: 'q-1', kind: 'quotient', step: 1, row: 'quotient', col: 1, expected: '0' },
        { id: 'p-1-0', kind: 'product', step: 1, row: { stepRow: 1, part: 'product' }, col: 1, expected: '0' },
        { id: 'w-1-0', kind: 'working', step: 1, row: { stepRow: 1, part: 'working' }, col: 1, expected: '1' },
        { id: 'w-1-1', kind: 'working', step: 1, row: { stepRow: 1, part: 'working' }, col: 2, expected: '2' },
        { id: 'q-2', kind: 'quotient', step: 2, row: 'quotient', col: 2, expected: '2' },
        { id: 'p-2-0', kind: 'product', step: 2, row: { stepRow: 2, part: 'product' }, col: 1, expected: '1' },
        { id: 'p-2-1', kind: 'product', step: 2, row: { stepRow: 2, part: 'product' }, col: 2, expected: '2' },
        { id: 'final', kind: 'final', step: 2, row: 'final', col: 2, expected: '0' },
      ]);
    });

    it('fixture 3: 4056 ÷ 4 = 1014 (14 cells, 4-digit dividend)', () => {
      const layout = buildDivisionLayout(4056, 4);

      expect(layout.dividend).toBe(4056);
      expect(layout.divisor).toBe(4);
      expect(layout.quotient).toBe(1014);
      expect(layout.dividendDigits).toEqual(['4', '0', '5', '6']);
      expect(layout.cells).toHaveLength(14);
      expect(layout.solvingSequence).toHaveLength(14);

      expect(layout.cells).toEqual([
        { id: 'q-0', kind: 'quotient', step: 0, row: 'quotient', col: 0, expected: '1' },
        { id: 'p-0-0', kind: 'product', step: 0, row: { stepRow: 0, part: 'product' }, col: 0, expected: '4' },
        { id: 'w-0-0', kind: 'working', step: 0, row: { stepRow: 0, part: 'working' }, col: 1, expected: '0' },
        { id: 'q-1', kind: 'quotient', step: 1, row: 'quotient', col: 1, expected: '0' },
        { id: 'p-1-0', kind: 'product', step: 1, row: { stepRow: 1, part: 'product' }, col: 1, expected: '0' },
        { id: 'w-1-0', kind: 'working', step: 1, row: { stepRow: 1, part: 'working' }, col: 2, expected: '5' },
        { id: 'q-2', kind: 'quotient', step: 2, row: 'quotient', col: 2, expected: '1' },
        { id: 'p-2-0', kind: 'product', step: 2, row: { stepRow: 2, part: 'product' }, col: 2, expected: '4' },
        { id: 'w-2-0', kind: 'working', step: 2, row: { stepRow: 2, part: 'working' }, col: 2, expected: '1' },
        { id: 'w-2-1', kind: 'working', step: 2, row: { stepRow: 2, part: 'working' }, col: 3, expected: '6' },
        { id: 'q-3', kind: 'quotient', step: 3, row: 'quotient', col: 3, expected: '4' },
        { id: 'p-3-0', kind: 'product', step: 3, row: { stepRow: 3, part: 'product' }, col: 2, expected: '1' },
        { id: 'p-3-1', kind: 'product', step: 3, row: { stepRow: 3, part: 'product' }, col: 3, expected: '6' },
        { id: 'final', kind: 'final', step: 3, row: 'final', col: 3, expected: '0' },
      ]);
    });

    it('fixture 4: 215 ÷ 5 = 43 (9 cells, initial W=21 two digits, first product is 20 not 21)', () => {
      const layout = buildDivisionLayout(215, 5);

      expect(layout.dividend).toBe(215);
      expect(layout.divisor).toBe(5);
      expect(layout.quotient).toBe(43);
      expect(layout.dividendDigits).toEqual(['2', '1', '5']);
      expect(layout.cells).toHaveLength(9);
      expect(layout.solvingSequence).toHaveLength(9);

      // Verify that initial W=21 does NOT appear as cells
      expect(layout.cells.filter((c) => c.kind === 'working')).toHaveLength(2); // only 'w-0-0' and 'w-0-1'
      // First product is 20 (two cells), not 21
      expect(layout.cells.find((c) => c.id === 'p-0-0')).toEqual({
        id: 'p-0-0',
        kind: 'product',
        step: 0,
        row: { stepRow: 0, part: 'product' },
        col: 0,
        expected: '2',
      });
      expect(layout.cells.find((c) => c.id === 'p-0-1')).toEqual({
        id: 'p-0-1',
        kind: 'product',
        step: 0,
        row: { stepRow: 0, part: 'product' },
        col: 1,
        expected: '0',
      });

      expect(layout.cells).toEqual([
        { id: 'q-0', kind: 'quotient', step: 0, row: 'quotient', col: 0, expected: '4' },
        { id: 'p-0-0', kind: 'product', step: 0, row: { stepRow: 0, part: 'product' }, col: 0, expected: '2' },
        { id: 'p-0-1', kind: 'product', step: 0, row: { stepRow: 0, part: 'product' }, col: 1, expected: '0' },
        { id: 'w-0-0', kind: 'working', step: 0, row: { stepRow: 0, part: 'working' }, col: 1, expected: '1' },
        { id: 'w-0-1', kind: 'working', step: 0, row: { stepRow: 0, part: 'working' }, col: 2, expected: '5' },
        { id: 'q-1', kind: 'quotient', step: 1, row: 'quotient', col: 1, expected: '3' },
        { id: 'p-1-0', kind: 'product', step: 1, row: { stepRow: 1, part: 'product' }, col: 1, expected: '1' },
        { id: 'p-1-1', kind: 'product', step: 1, row: { stepRow: 1, part: 'product' }, col: 2, expected: '5' },
        { id: 'final', kind: 'final', step: 1, row: 'final', col: 2, expected: '0' },
      ]);
    });

    it('fixture 5: 1000 ÷ 8 = 125 (13 cells, initial W=10)', () => {
      const layout = buildDivisionLayout(1000, 8);

      expect(layout.dividend).toBe(1000);
      expect(layout.divisor).toBe(8);
      expect(layout.quotient).toBe(125);
      expect(layout.dividendDigits).toEqual(['1', '0', '0', '0']);
      expect(layout.cells).toHaveLength(13);
      expect(layout.solvingSequence).toHaveLength(13);

      expect(layout.cells).toEqual([
        { id: 'q-0', kind: 'quotient', step: 0, row: 'quotient', col: 0, expected: '1' },
        { id: 'p-0-0', kind: 'product', step: 0, row: { stepRow: 0, part: 'product' }, col: 1, expected: '8' },
        { id: 'w-0-0', kind: 'working', step: 0, row: { stepRow: 0, part: 'working' }, col: 1, expected: '2' },
        { id: 'w-0-1', kind: 'working', step: 0, row: { stepRow: 0, part: 'working' }, col: 2, expected: '0' },
        { id: 'q-1', kind: 'quotient', step: 1, row: 'quotient', col: 1, expected: '2' },
        { id: 'p-1-0', kind: 'product', step: 1, row: { stepRow: 1, part: 'product' }, col: 1, expected: '1' },
        { id: 'p-1-1', kind: 'product', step: 1, row: { stepRow: 1, part: 'product' }, col: 2, expected: '6' },
        { id: 'w-1-0', kind: 'working', step: 1, row: { stepRow: 1, part: 'working' }, col: 2, expected: '4' },
        { id: 'w-1-1', kind: 'working', step: 1, row: { stepRow: 1, part: 'working' }, col: 3, expected: '0' },
        { id: 'q-2', kind: 'quotient', step: 2, row: 'quotient', col: 2, expected: '5' },
        { id: 'p-2-0', kind: 'product', step: 2, row: { stepRow: 2, part: 'product' }, col: 2, expected: '4' },
        { id: 'p-2-1', kind: 'product', step: 2, row: { stepRow: 2, part: 'product' }, col: 3, expected: '0' },
        { id: 'final', kind: 'final', step: 2, row: 'final', col: 3, expected: '0' },
      ]);
    });
  });

  describe('Determinism', () => {
    it('calling buildDivisionLayout multiple times produces identical deep-equal output without Math.random', () => {
      const layoutA = buildDivisionLayout(345, 3);
      const layoutB = buildDivisionLayout(345, 3);
      expect(layoutA).toEqual(layoutB);

      const layoutC = buildDivisionLayout(4056, 4);
      const layoutD = buildDivisionLayout(4056, 4);
      expect(layoutC).toEqual(layoutD);
    });
  });

  describe('Exhaustive evaluation across all 18,106 valid division candidate pairs', () => {
    // Independent manual solver for validation simulation
    function solveIndependently(dividend: number, divisor: number): Record<string, string> {
      const digits = dividend.toString().split('');
      const n = digits.length;
      const d0 = Number(digits[0]);

      let W: number;
      let nextIdx: number;
      if (d0 >= divisor) {
        W = d0;
        nextIdx = 1;
      } else {
        W = d0 * 10 + Number(digits[1]);
        nextIdx = 2;
      }

      const answers: Record<string, string> = {};
      let step = 0;

      while (true) {
        const q = Math.floor(W / divisor);
        const P = q * divisor;
        const r = W - P;

        answers[`q-${step}`] = q.toString();

        const pStr = P.toString();
        for (let j = 0; j < pStr.length; j++) {
          answers[`p-${step}-${j}`] = pStr[j];
        }

        if (nextIdx < n) {
          const broughtDown = digits[nextIdx];
          if (r === 0) {
            answers[`w-${step}-0`] = broughtDown;
          } else {
            answers[`w-${step}-0`] = r.toString();
            answers[`w-${step}-1`] = broughtDown;
          }
          W = r * 10 + Number(broughtDown);
          nextIdx++;
          step++;
        } else {
          answers['final'] = '0';
          break;
        }
      }

      return answers;
    }

    it('processes exactly 18,106 exact division pairs with full invariant verification', () => {
      let processedCount = 0;
      const failures: string[] = [];

      for (let dividend = 100; dividend <= 9999; dividend++) {
        for (let divisor = 2; divisor <= 9; divisor++) {
          if (dividend % divisor !== 0) continue;

          processedCount++;
          const layout = buildDivisionLayout(dividend, divisor);
          const digits = dividend.toString().split('');
          const n = digits.length;
          const realQuotientStr = (dividend / divisor).toString();

          // (ა) Concatenated quotient digits equal real quotient
          const quotientDigits = layout.cells
            .filter((c) => c.kind === 'quotient')
            .map((c) => c.expected)
            .join('');
          if (quotientDigits !== realQuotientStr) {
            failures.push(`Quotient mismatch for ${dividend}/${divisor}: got ${quotientDigits}, expected ${realQuotientStr}`);
          }

          // (ბ) Independent solver verification
          const independentAnswers = solveIndependently(dividend, divisor);
          const validation = validateDivisionAnswers(layout, independentAnswers);
          if (!validation.isAllCorrect) {
            failures.push(`Independent validation failed for ${dividend}/${divisor}`);
          }

          // (გ) Structural invariants
          const expectedQuotientLen = Number(digits[0]) >= divisor ? n : n - 1;
          const quotientCells = layout.cells.filter((c) => c.kind === 'quotient');
          if (quotientCells.length !== expectedQuotientLen) {
            failures.push(`Quotient length mismatch for ${dividend}/${divisor}: got ${quotientCells.length}, expected ${expectedQuotientLen}`);
          }

          // All columns within [0, n - 1] and single digit expected
          for (const cell of layout.cells) {
            if (cell.col < 0 || cell.col >= n) {
              failures.push(`Column out of bounds for ${dividend}/${divisor}, cell ${cell.id}: col ${cell.col}`);
            }
            if (!/^[0-9]$/.test(cell.expected)) {
              failures.push(`Expected not single digit for ${dividend}/${divisor}, cell ${cell.id}: ${cell.expected}`);
            }
          }

          // Product cells never go left of column 0
          for (const pCell of layout.cells) {
            if (pCell.kind === 'product' && pCell.col < 0) {
              failures.push(`Product cell left of col 0 for ${dividend}/${divisor}, cell ${pCell.id}: col ${pCell.col}`);
            }
          }

          // Last cell is 'final' with expected '0'
          const finalCell = layout.cells[layout.cells.length - 1];
          if (finalCell.id !== 'final' || finalCell.kind !== 'final' || finalCell.expected !== '0') {
            failures.push(`Final cell mismatch for ${dividend}/${divisor}`);
          }

          // Unique stable cell IDs and solvingSequence completeness
          const idSet = new Set(layout.cells.map((c) => c.id));
          if (idSet.size !== layout.cells.length) {
            failures.push(`Duplicate cell ids for ${dividend}/${divisor}`);
          }
          if (layout.solvingSequence.length !== layout.cells.length) {
            failures.push(`solvingSequence length mismatch for ${dividend}/${divisor}`);
          }
          if (new Set(layout.solvingSequence).size !== layout.cells.length) {
            failures.push(`solvingSequence has duplicates for ${dividend}/${divisor}`);
          }

          if (failures.length > 0) {
            // Early break on failure to report immediately
            break;
          }
        }
        if (failures.length > 0) break;
      }

      expect(failures).toEqual([]);
      // Assert that exactly 18,106 candidate pairs were evaluated
      expect(processedCount).toBe(18106);
    }, 30000);
  });

  describe('validateDivisionAnswers', () => {
    function getCorrectAnswers(layout: DivisionLayout): Record<string, string> {
      const answers: Record<string, string> = {};
      for (const cell of layout.cells) {
        answers[cell.id] = cell.expected;
      }
      return answers;
    }

    it('(ა) correctAnswers unchanged: all cells are "correct", isAllCorrect is true', () => {
      const layout = buildDivisionLayout(345, 3);
      const correctAnswers = getCorrectAnswers(layout);

      const result = validateDivisionAnswers(layout, correctAnswers);
      expect(result.isAllCorrect).toBe(true);

      for (const cell of layout.cells) {
        expect(result.statuses[cell.id]).toBe('correct');
      }
    });

    it('(ბ) correctAnswers with exactly one cell changed to wrong digit: only that cell is "wrong", isAllCorrect is false', () => {
      const layout = buildDivisionLayout(345, 3);
      const correctAnswers = getCorrectAnswers(layout);

      // Mutate exactly one cell (e.g. 'q-1')
      const targetCellId = 'q-1';
      const originalValue = correctAnswers[targetCellId];
      const wrongValue = originalValue === '9' ? '8' : '9';
      const modifiedAnswers = {
        ...correctAnswers,
        [targetCellId]: wrongValue,
      };

      const result = validateDivisionAnswers(layout, modifiedAnswers);
      expect(result.isAllCorrect).toBe(false);
      expect(result.statuses[targetCellId]).toBe('wrong');

      for (const cell of layout.cells) {
        if (cell.id === targetCellId) {
          expect(result.statuses[cell.id]).toBe('wrong');
        } else {
          expect(result.statuses[cell.id]).toBe('correct');
        }
      }
    });

    it('(გ) correctAnswers with exactly one cell removed or empty: only that cell is "empty", isAllCorrect is false', () => {
      const layout = buildDivisionLayout(345, 3);
      const correctAnswers = getCorrectAnswers(layout);

      // 1. Removed key
      const targetCellId = 'w-1-1';
      const removedAnswers = { ...correctAnswers };
      delete removedAnswers[targetCellId];

      const resultRemoved = validateDivisionAnswers(layout, removedAnswers);
      expect(resultRemoved.isAllCorrect).toBe(false);
      expect(resultRemoved.statuses[targetCellId]).toBe('empty');

      for (const cell of layout.cells) {
        if (cell.id === targetCellId) {
          expect(resultRemoved.statuses[cell.id]).toBe('empty');
        } else {
          expect(resultRemoved.statuses[cell.id]).toBe('correct');
        }
      }

      // 2. Empty string value
      const emptyStringAnswers = {
        ...correctAnswers,
        [targetCellId]: '',
      };

      const resultEmpty = validateDivisionAnswers(layout, emptyStringAnswers);
      expect(resultEmpty.isAllCorrect).toBe(false);
      expect(resultEmpty.statuses[targetCellId]).toBe('empty');

      for (const cell of layout.cells) {
        if (cell.id === targetCellId) {
          expect(resultEmpty.statuses[cell.id]).toBe('empty');
        } else {
          expect(resultEmpty.statuses[cell.id]).toBe('correct');
        }
      }
    });
  });

  describe('Invalid inputs error handling', () => {
    it('throws error when divisor is out of range (< 2 or > 9)', () => {
      expect(() => buildDivisionLayout(345, 1)).toThrow(/Invalid divisor/);
      expect(() => buildDivisionLayout(345, 10)).toThrow(/Invalid divisor/);
      expect(() => buildDivisionLayout(345, 0)).toThrow(/Invalid divisor/);
      expect(() => buildDivisionLayout(345, -3)).toThrow(/Invalid divisor/);
      expect(() => buildDivisionLayout(345, 2.5)).toThrow(/Invalid divisor/);
    });

    it('throws error when dividend is out of range (< 100 or > 9999)', () => {
      expect(() => buildDivisionLayout(99, 3)).toThrow(/Invalid dividend/);
      expect(() => buildDivisionLayout(10000, 5)).toThrow(/Invalid dividend/);
      expect(() => buildDivisionLayout(50, 2)).toThrow(/Invalid dividend/);
      expect(() => buildDivisionLayout(100000, 4)).toThrow(/Invalid dividend/);
      expect(() => buildDivisionLayout(300.5, 3)).toThrow(/Invalid dividend/);
    });

    it('throws error when division has a remainder (not evenly divisible)', () => {
      expect(() => buildDivisionLayout(346, 3)).toThrow(/not evenly divisible/);
      expect(() => buildDivisionLayout(101, 2)).toThrow(/not evenly divisible/);
      expect(() => buildDivisionLayout(216, 5)).toThrow(/not evenly divisible/);
      expect(() => buildDivisionLayout(4057, 4)).toThrow(/not evenly divisible/);
    });
  });
});
