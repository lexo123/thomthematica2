import { MathProblem, Operation } from '../types';
import { DivisionLayout, buildDivisionLayout } from './columnDivision';

/**
 * Safely extracts and builds the division layout for a given problem.
 * Returns null if problem is null/undefined, not a math division problem,
 * or if buildDivisionLayout throws an error (e.g. invalid arguments or remainder).
 * Never throws.
 */
export function getDivisionLayoutForProblem(
  problem: MathProblem | null | undefined
): DivisionLayout | null {
  if (!problem) return null;
  if (problem.category !== 'math') return null;
  if (!('operation' in problem) || problem.operation !== Operation.Divide) return null;
  if (typeof problem.num1 !== 'number' || typeof problem.num2 !== 'number') return null;
  if (isNaN(problem.num1) || isNaN(problem.num2)) return null;

  try {
    return buildDivisionLayout(problem.num1, problem.num2);
  } catch {
    return null;
  }
}
