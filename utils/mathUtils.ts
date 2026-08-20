/**
 * 🧮 Pure mathematical utility functions
 */

export const calculateSquareArea = (side: number): number => side * side;

export const calculateSquarePerimeter = (side: number): number => side * 4;

export const calculateRectangleArea = (length: number, width: number): number => length * width;

export const calculateRectanglePerimeter = (length: number, width: number): number => 2 * (length + width);

export const calculateTrianglePerimeter = (a: number, b: number, c: number): number => a + b + c;

export const calculatePolygonPerimeter = (sides: number[]): number => sides.reduce((acc, val) => acc + val, 0);

/**
 * Validates whether 3 lengths can form a valid triangle
 */
export const isValidTriangle = (a: number, b: number, c: number): boolean => {
  return a + b > c && a + c > b && b + c > a;
};

/**
 * Calculate game score based on correct answers and time
 */
export const calculatePoints = (isCorrect: boolean, timeRemainingSeconds: number = 0): number => {
  if (!isCorrect) return 0;
  return 10 + Math.max(0, timeRemainingSeconds);
};
