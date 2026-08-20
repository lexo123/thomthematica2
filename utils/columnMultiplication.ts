import { MathProblem } from '../types';

export interface ExpectedDigits {
  r1: string[];
  r2: string[];
  res: string[];
}

export interface CellPosition {
  row: 'r1' | 'r2' | 'res';
  col: number;
}

/**
 * Calculates the expected digits for column multiplication steps:
 * r1: product with ones digit
 * r2: product with tens digit
 * res: total product (r1 + r2 * 10)
 */
export const getExpectedDigits = (num1: number, num2: number): ExpectedDigits => {
  const bOnes = num2 % 10;
  const bTens = Math.floor(num2 / 10);
  
  const r1Val = num1 * bOnes;
  const r2Val = num1 * bTens;
  const resVal = num1 * num2;
  
  const r1 = [
    r1Val >= 1000 ? (Math.floor(r1Val / 1000) % 10).toString() : "",
    r1Val >= 100 ? (Math.floor(r1Val / 100) % 10).toString() : "",
    r1Val >= 10 ? (Math.floor(r1Val / 10) % 10).toString() : "",
    (r1Val % 10).toString()
  ];
  
  const r2 = [
    r2Val >= 100 ? (Math.floor(r2Val / 100) % 10).toString() : "",
    r2Val >= 10 ? (Math.floor(r2Val / 10) % 10).toString() : "",
    (r2Val % 10).toString(),
    ""
  ];
  
  const res = [
    resVal >= 1000 ? (Math.floor(resVal / 1000) % 10).toString() : "",
    resVal >= 100 ? (Math.floor(resVal / 100) % 10).toString() : "",
    resVal >= 10 ? (Math.floor(resVal / 10) % 10).toString() : "",
    (resVal % 10).toString()
  ];
  
  return { r1, r2, res };
};

/**
 * Determines the step-by-step navigation order for column multiplication inputs
 */
export const getSolvingSequence = (problem: MathProblem | null): CellPosition[] => {
  if (!problem || !('num1' in problem) || problem.num1 === undefined || problem.num2 === undefined) return [];
  
  const sequence: CellPosition[] = [];
  
  for (let c = 3; c >= 0; c--) {
    sequence.push({ row: 'r1', col: c });
  }
  for (let c = 3; c >= 0; c--) {
    sequence.push({ row: 'r2', col: c });
  }
  for (let c = 3; c >= 0; c--) {
    sequence.push({ row: 'res', col: c });
  }
  
  return sequence;
};
