import { describe, it, expect } from 'vitest';
import { generateProblem } from './problemGenerator';
import { GameMode, Operation } from '../types';

describe('problemGenerator', () => {
  it('generates column multiplication problems with non-zero 2-digit numbers', () => {
    for (let i = 0; i < 20; i++) {
      const problem = generateProblem(GameMode.Kveshmicera, i);
      expect(problem.category).toBe('math');
      if ('num1' in problem && 'num2' in problem) {
        expect(problem.num1).toBeGreaterThanOrEqual(11);
        expect(problem.num1).toBeLessThanOrEqual(99);
        expect(problem.num2).toBeGreaterThanOrEqual(11);
        expect(problem.num2).toBeLessThanOrEqual(99);
        expect(problem.operation).toBe(Operation.Multiply);
        expect(problem.answer).toBe(problem.num1 * problem.num2);
      }
    }
  });

  it('generates geometry problems with positive answers and valid figures', () => {
    for (let i = 0; i < 30; i++) {
      const problem = generateProblem(GameMode.Gethometria, i);
      expect(problem.category).toBe('geometry');
      if ('figure' in problem) {
        expect(problem.figure).toBeDefined();
        expect(problem.measurement).toBeDefined();
        expect(problem.sides).toBeDefined();
        expect(Array.isArray(problem.sides)).toBe(true);
        expect(problem.sides.length).toBeGreaterThan(0);
        expect(problem.answer).toBeGreaterThan(0);
      }
    }
  });

  it('generates arithmetic problems with non-negative answers', () => {
    for (let i = 0; i < 50; i++) {
      const problem = generateProblem(GameMode.Thomthematica, i);
      expect(typeof problem.answer).toBe('number');
      expect(Number.isNaN(problem.answer)).toBe(false);
      expect(problem.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it('generates multiplication table problems within expected ranges', () => {
    for (let i = 0; i < 20; i++) {
      const problem = generateProblem(GameMode.ThomravlebisTabula, i);
      if ('operation' in problem) {
        expect(problem.operation).toBe(Operation.Multiply);
      }
      if ('num1' in problem && 'num2' in problem) {
        expect(problem.num1).toBeGreaterThanOrEqual(0);
        expect(problem.num1).toBeLessThanOrEqual(10);
        expect(problem.num2).toBeGreaterThanOrEqual(0);
        expect(problem.num2).toBeLessThanOrEqual(10);
        expect(problem.answer).toBe(problem.num1 * problem.num2);
      }
    }
  });
});
