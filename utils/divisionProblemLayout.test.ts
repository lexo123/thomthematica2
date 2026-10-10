import { describe, it, expect } from 'vitest';
import { getDivisionLayoutForProblem } from './divisionProblemLayout';
import { Operation, MathProblem } from '../types';

describe('getDivisionLayoutForProblem', () => {
  it('returns valid layout with 13 cells for valid 345 ÷ 3 problem', () => {
    const problem: MathProblem = {
      category: 'math',
      num1: 345,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };

    const layout = getDivisionLayoutForProblem(problem);
    expect(layout).not.toBeNull();
    expect(layout?.cells.length).toBe(13);
    expect(layout?.dividend).toBe(345);
    expect(layout?.divisor).toBe(3);
    expect(layout?.quotient).toBe(115);
  });

  it('returns null and does not throw for multiplication problem (24 × 12)', () => {
    const multProblem: MathProblem = {
      category: 'math',
      num1: 24,
      num2: 12,
      operation: Operation.Multiply,
      answer: 288,
    };

    expect(() => {
      const res = getDivisionLayoutForProblem(multProblem);
      expect(res).toBeNull();
    }).not.toThrow();
  });

  it('returns null and does not throw for geometry problem', () => {
    const geoProblem: MathProblem = {
      category: 'geometry',
      figure: 'square',
      measurement: 'perimeter',
      sides: [5],
      answer: 20,
    };

    expect(() => {
      const res = getDivisionLayoutForProblem(geoProblem);
      expect(res).toBeNull();
    }).not.toThrow();
  });

  it('returns null and does not throw for null and undefined', () => {
    expect(() => {
      expect(getDivisionLayoutForProblem(null)).toBeNull();
      expect(getDivisionLayoutForProblem(undefined)).toBeNull();
    }).not.toThrow();
  });

  it('returns null and does not throw for divisor 1 or 10', () => {
    const probDiv1: MathProblem = {
      category: 'math',
      num1: 300,
      num2: 1,
      operation: Operation.Divide,
      answer: 300,
    };
    const probDiv10: MathProblem = {
      category: 'math',
      num1: 300,
      num2: 10,
      operation: Operation.Divide,
      answer: 30,
    };

    expect(() => {
      expect(getDivisionLayoutForProblem(probDiv1)).toBeNull();
      expect(getDivisionLayoutForProblem(probDiv10)).toBeNull();
    }).not.toThrow();
  });

  it('returns null and does not throw for dividend 99 or 10000', () => {
    const prob99: MathProblem = {
      category: 'math',
      num1: 99,
      num2: 3,
      operation: Operation.Divide,
      answer: 33,
    };
    const prob10000: MathProblem = {
      category: 'math',
      num1: 10000,
      num2: 5,
      operation: Operation.Divide,
      answer: 2000,
    };

    expect(() => {
      expect(getDivisionLayoutForProblem(prob99)).toBeNull();
      expect(getDivisionLayoutForProblem(prob10000)).toBeNull();
    }).not.toThrow();
  });

  it('returns null and does not throw for non-exact division with remainder (346 ÷ 3)', () => {
    const remainderProblem: MathProblem = {
      category: 'math',
      num1: 346,
      num2: 3,
      operation: Operation.Divide,
      answer: 115,
    };

    expect(() => {
      expect(getDivisionLayoutForProblem(remainderProblem)).toBeNull();
    }).not.toThrow();
  });
});
