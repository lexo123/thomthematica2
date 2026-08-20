export enum GameMode {
  Thomthematica = 'thomthematica',
  ThomravlebisTabula = 'thomravlebis_tabula',
  Gethometria = 'gethometria',
  Kveshmicera = 'kveshmicera'
}

export enum Operation {
  Add = '+',
  Subtract = '-',
  Multiply = '×',
  Divide = '÷'
}

export type MissingPart = 'num1' | 'num2' | 'num3' | 'result';

export type ProblemCategory = 'math' | 'geometry';
export type FigureType = 'square' | 'rectangle' | 'triangle' | 'pentagon' | 'hexagon' | 'irregular_pentagon' | 'irregular_hexagon' | 'irregular_quadrilateral';
export type MeasurementType = 'perimeter' | 'area' | 'sidesCount' | 'anglesCount';

export interface BaseProblem {
  category: ProblemCategory;
  answer: number;
}

export interface ArithmeticProblem extends BaseProblem {
  category: 'math';
  num1: number;
  num2: number;
  num3?: number;
  operation: Operation;
  operation2?: Operation;
  missingPart?: MissingPart;
  equationResult?: number;
}

export interface GeometryProblem extends BaseProblem {
  category: 'geometry';
  figure: FigureType;
  measurement: MeasurementType;
  sides: number[];
  shapeVariant?: number;
}

export type MathProblem = ArithmeticProblem | GeometryProblem;

export enum GameState {
  Playing,
  Correct,
  Incorrect
}

export type TextPos = { x: string; y: string; anchor?: "start" | "middle" | "end" };
export type ShapeVariant = { points: string; texts: TextPos[] };

export type ColMultState = {
  r1: string[];
  r2: string[];
  res: string[];
};
