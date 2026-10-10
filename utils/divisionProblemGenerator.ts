import { ArithmeticProblem, Operation } from '../types';

/**
 * Generates an exact (no-remainder) division problem with:
 * - dividend (num1): 3 or 4-digit number (50/50 probability)
 * - divisor (num2): integer between 2 and 9
 * - quotient (answer): integer result of num1 / num2
 *
 * Accepts an optional rng function for deterministic testing.
 */
export function generateDivisionProblem(rng: () => number = Math.random): ArithmeticProblem {
  const numDigits = rng() < 0.5 ? 3 : 4;
  const divisor = Math.floor(rng() * 8) + 2;

  const minDividend = Math.pow(10, numDigits - 1);
  const maxDividend = Math.pow(10, numDigits) - 1;

  const minQ = Math.ceil(minDividend / divisor);
  const maxQ = Math.floor(maxDividend / divisor);

  const quotient = Math.floor(rng() * (maxQ - minQ + 1)) + minQ;
  const dividend = quotient * divisor;

  return {
    category: 'math',
    operation: Operation.Divide,
    num1: dividend,
    num2: divisor,
    answer: quotient,
  };
}
