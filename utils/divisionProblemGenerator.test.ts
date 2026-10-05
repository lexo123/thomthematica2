import { describe, it, expect } from 'vitest';
import { generateDivisionProblem } from './divisionProblemGenerator';
import { buildDivisionLayout } from './columnDivision';
import { Operation } from '../types';

describe('divisionProblemGenerator', () => {
  it('generates predictable problem with deterministic rng', () => {
    // Sequence of deterministic numbers:
    // 1st call rng(): numDigits < 0.5 -> 3 digits
    // 2nd call rng(): divisor = floor(0.125 * 8) + 2 = 1 + 2 = 3
    // minDividend = 100, maxDividend = 999
    // minQ = ceil(100 / 3) = 34, maxQ = floor(999 / 3) = 333
    // range = 333 - 34 + 1 = 300
    // 3rd call rng(): quotient = floor(0.5 * 300) + 34 = 150 + 34 = 184
    // dividend = 184 * 3 = 552
    const numbers = [0.1, 0.125, 0.5];
    let idx = 0;
    const deterministicRng = () => numbers[idx++];

    const problem = generateDivisionProblem(deterministicRng);

    expect(problem.category).toBe('math');
    expect(problem.operation).toBe(Operation.Divide);
    expect(problem.num1).toBe(552);
    expect(problem.num2).toBe(3);
    expect(problem.answer).toBe(184);
    expect(problem.num1 % problem.num2).toBe(0);

    // Verified with buildDivisionLayout
    expect(() => buildDivisionLayout(problem.num1, problem.num2)).not.toThrow();
  });

  it('generates valid 4-digit problem with deterministic rng', () => {
    // 1st call rng(): numDigits >= 0.5 -> 4 digits
    // 2nd call rng(): divisor = floor(0.75 * 8) + 2 = 6 + 2 = 8
    // minDividend = 1000, maxDividend = 9999
    // minQ = ceil(1000 / 8) = 125, maxQ = floor(9999 / 8) = 1249
    // range = 1249 - 125 + 1 = 1125
    // 3rd call rng(): 0.0 -> quotient = 125, dividend = 1000
    const numbers = [0.9, 0.75, 0.0];
    let idx = 0;
    const deterministicRng = () => numbers[idx++];

    const problem = generateDivisionProblem(deterministicRng);

    expect(problem.category).toBe('math');
    expect(problem.operation).toBe(Operation.Divide);
    expect(problem.num1).toBe(1000);
    expect(problem.num2).toBe(8);
    expect(problem.answer).toBe(125);
    expect(problem.num1 % problem.num2).toBe(0);

    expect(() => buildDivisionLayout(problem.num1, problem.num2)).not.toThrow();
  });

  it('works with default Math.random parameter', () => {
    const problem = generateDivisionProblem();

    expect(problem.category).toBe('math');
    expect(problem.operation).toBe(Operation.Divide);
    expect(problem.num2).toBeGreaterThanOrEqual(2);
    expect(problem.num2).toBeLessThanOrEqual(9);
    expect(problem.num1 % problem.num2).toBe(0);
    expect(problem.answer).toBe(problem.num1 / problem.num2);
    expect(() => buildDivisionLayout(problem.num1, problem.num2)).not.toThrow();
  });

  it('evaluates 2000 calls across full random range verifying all invariants', () => {
    let hasLength3 = false;
    let hasLength4 = false;
    let hasQuotientWithZero = false;

    for (let i = 0; i < 2000; i++) {
      const problem = generateDivisionProblem();

      // Structure checks
      expect(problem.category).toBe('math');
      expect(problem.operation).toBe(Operation.Divide);

      // Divisor in [2, 9]
      expect(problem.num2).toBeGreaterThanOrEqual(2);
      expect(problem.num2).toBeLessThanOrEqual(9);
      expect(Number.isInteger(problem.num2)).toBe(true);

      // Dividend 3 or 4 digits
      expect(problem.num1).toBeGreaterThanOrEqual(100);
      expect(problem.num1).toBeLessThanOrEqual(9999);
      expect(Number.isInteger(problem.num1)).toBe(true);

      const len = problem.num1.toString().length;
      if (len === 3) hasLength3 = true;
      if (len === 4) hasLength4 = true;

      // Exact division
      expect(problem.num1 % problem.num2).toBe(0);
      expect(problem.answer).toBe(problem.num1 / problem.num2);

      // Check quotient with digit '0'
      if (problem.answer.toString().includes('0')) {
        hasQuotientWithZero = true;
      }

      // Must be accepted by buildDivisionLayout without throwing
      expect(() => buildDivisionLayout(problem.num1, problem.num2)).not.toThrow();
    }

    // Both 3 and 4-digit dividends appear
    expect(hasLength3).toBe(true);
    expect(hasLength4).toBe(true);

    // At least one problem has a quotient with digit '0'
    expect(hasQuotientWithZero).toBe(true);
  });
});
