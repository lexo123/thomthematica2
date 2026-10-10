import { describe, it, expect } from 'vitest';
import {
  buildDivisionLayout,
  validateDivisionAnswers,
  DivisionLayout,
} from './columnDivision';

describe('columnDivision', () => {
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

  describe('validateDivisionAnswers (§2 rule-based evaluation)', () => {
    function getCorrectAnswers(layout: DivisionLayout): Record<string, string> {
      const answers: Record<string, string> = {};
      for (const cell of layout.cells) {
        answers[cell.id] = cell.expected;
      }
      return answers;
    }

    it('(1) correctAnswers unchanged: all cells are "correct", isAllCorrect is true', () => {
      const layout = buildDivisionLayout(345, 3);
      const correctAnswers = getCorrectAnswers(layout);

      const result = validateDivisionAnswers(layout, correctAnswers);
      expect(result.isAllCorrect).toBe(true);

      for (const cell of layout.cells) {
        expect(result.statuses[cell.id]).toBe('correct');
      }
    });

    it('(2) required cell left empty: status is "empty", isAllCorrect is false', () => {
      const layout = buildDivisionLayout(345, 3);
      const correctAnswers = getCorrectAnswers(layout);

      const targetCellId = 'q-1';
      expect(layout.cells.find((c) => c.id === targetCellId)?.rule).toBe('required');

      const emptyStringAnswers = {
        ...correctAnswers,
        [targetCellId]: '',
      };
      const resultEmpty = validateDivisionAnswers(layout, emptyStringAnswers);
      expect(resultEmpty.isAllCorrect).toBe(false);
      expect(resultEmpty.statuses[targetCellId]).toBe('empty');

      const deletedAnswers = { ...correctAnswers };
      delete deletedAnswers[targetCellId];
      const resultDeleted = validateDivisionAnswers(layout, deletedAnswers);
      expect(resultDeleted.isAllCorrect).toBe(false);
      expect(resultDeleted.statuses[targetCellId]).toBe('empty');
    });

    it('(3) required cell with wrong digit: status is "wrong", isAllCorrect is false', () => {
      const layout = buildDivisionLayout(345, 3);
      const correctAnswers = getCorrectAnswers(layout);

      const targetCellId = 'q-1';
      const modifiedAnswers = {
        ...correctAnswers,
        [targetCellId]: '9',
      };
      const result = validateDivisionAnswers(layout, modifiedAnswers);
      expect(result.isAllCorrect).toBe(false);
      expect(result.statuses[targetCellId]).toBe('wrong');
    });

    it('(4) optional cell left empty or deleted: status is "correct", isAllCorrect is true', () => {
      const layout = buildDivisionLayout(345, 3);
      const correctAnswers = getCorrectAnswers(layout);

      const targetCellId = 'final';
      expect(layout.cells.find((c) => c.id === targetCellId)?.rule).toBe('optional');

      const emptyStringAnswers = {
        ...correctAnswers,
        [targetCellId]: '',
      };
      const resultEmpty = validateDivisionAnswers(layout, emptyStringAnswers);
      expect(resultEmpty.statuses[targetCellId]).toBe('correct');
      expect(resultEmpty.isAllCorrect).toBe(true);

      const deletedAnswers = { ...correctAnswers };
      delete deletedAnswers[targetCellId];
      const resultDeleted = validateDivisionAnswers(layout, deletedAnswers);
      expect(resultDeleted.statuses[targetCellId]).toBe('correct');
      expect(resultDeleted.isAllCorrect).toBe(true);
    });

    it('(5) optional cell with correct digit: status is "correct", isAllCorrect is true', () => {
      const layout = buildDivisionLayout(345, 3);
      const correctAnswers = getCorrectAnswers(layout);

      const targetCellId = 'final';
      const result = validateDivisionAnswers(layout, {
        ...correctAnswers,
        [targetCellId]: '0',
      });
      expect(result.statuses[targetCellId]).toBe('correct');
      expect(result.isAllCorrect).toBe(true);
    });

    it('(6) optional cell with wrong digit: status is "wrong", isAllCorrect is false', () => {
      const layout = buildDivisionLayout(345, 3);
      const correctAnswers = getCorrectAnswers(layout);

      const targetCellId = 'final';
      const result = validateDivisionAnswers(layout, {
        ...correctAnswers,
        [targetCellId]: '7',
      });
      expect(result.statuses[targetCellId]).toBe('wrong');
      expect(result.isAllCorrect).toBe(false);
    });

    it('(7) spare cell left empty: status is "correct", isAllCorrect is true', () => {
      const layout = buildDivisionLayout(215, 5);
      const correctAnswers = getCorrectAnswers(layout);

      const spareCell = layout.cells.find((c) => c.id === 's-0')!;
      expect(spareCell).toBeDefined();
      expect(spareCell.rule).toBe('blank');

      const emptyAnswers = { ...correctAnswers, 's-0': '' };
      const resultEmpty = validateDivisionAnswers(layout, emptyAnswers);
      expect(resultEmpty.statuses['s-0']).toBe('correct');
      expect(resultEmpty.isAllCorrect).toBe(true);

      const deletedAnswers = { ...correctAnswers };
      delete deletedAnswers['s-0'];
      const resultDeleted = validateDivisionAnswers(layout, deletedAnswers);
      expect(resultDeleted.statuses['s-0']).toBe('correct');
      expect(resultDeleted.isAllCorrect).toBe(true);
    });

    it('(8) spare cell with "0" or "5": status is "wrong", isAllCorrect is false', () => {
      const layout = buildDivisionLayout(215, 5);
      const correctAnswers = getCorrectAnswers(layout);

      const resultZero = validateDivisionAnswers(layout, {
        ...correctAnswers,
        's-0': '0',
      });
      expect(resultZero.statuses['s-0']).toBe('wrong');
      expect(resultZero.isAllCorrect).toBe(false);

      const resultFive = validateDivisionAnswers(layout, {
        ...correctAnswers,
        's-0': '5',
      });
      expect(resultFive.statuses['s-0']).toBe('wrong');
      expect(resultFive.isAllCorrect).toBe(false);
    });

    it('(9) only required cells filled correctly (all optional and spare left empty): isAllCorrect is true', () => {
      const layout = buildDivisionLayout(215, 5);
      const onlyRequiredAnswers: Record<string, string> = {};

      for (const cell of layout.cells) {
        if (cell.rule === 'required') {
          onlyRequiredAnswers[cell.id] = cell.expected;
        }
      }

      const result = validateDivisionAnswers(layout, onlyRequiredAnswers);
      expect(result.isAllCorrect).toBe(true);

      for (const cell of layout.cells) {
        expect(result.statuses[cell.id]).toBe('correct');
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
