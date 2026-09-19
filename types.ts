import type { ImageConfig } from './data/rewards';

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

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  avatar_id: string;
  gender: 'boy' | 'girl';
  created_at: string;
}

export interface GameSession {
  id: string;
  child_id: string;
  game_mode: string;
  total_questions: number;
  total_correct: number;
  perfect_blocks_count: number;
  duration_seconds: number;
  status: 'active' | 'completed';
  started_at: string;
  ended_at?: string | null;
  updated_at: string;
}

export interface Wish {
  id: string;
  child_id: string;
  wish_text: string;
  correct_count: 19 | 20 | 39 | 40;
  status: 'pending' | 'fulfilled';
  fulfilled_at?: string | null;
  created_at: string;
}

export type RewardCategory = 'winner' | 'loser' | 'super_winner';

export interface ChildRewardImage {
  id: string;
  child_id: string;
  category: RewardCategory;
  storage_path: string;
  caption: string;
  sort_order: number;
}

export interface ChildRewardImagesState {
  isPersonalized: boolean; // true მხოლოდ თუ სამივე კატეგორიას აქვს >=1 row
  winner: ImageConfig[];
  loser: ImageConfig[];
  super_winner: ImageConfig[];
}
