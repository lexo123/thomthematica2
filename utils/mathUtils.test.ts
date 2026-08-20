import { describe, it, expect } from 'vitest';
import {
  calculateSquareArea,
  calculateSquarePerimeter,
  calculateRectangleArea,
  calculateRectanglePerimeter,
  calculateTrianglePerimeter,
  calculatePolygonPerimeter,
  isValidTriangle,
  calculatePoints,
} from './mathUtils';

describe('mathUtils', () => {
  it('calculates square area correctly', () => {
    expect(calculateSquareArea(5)).toBe(25);
    expect(calculateSquareArea(10)).toBe(100);
  });

  it('calculates square perimeter correctly', () => {
    expect(calculateSquarePerimeter(5)).toBe(20);
    expect(calculateSquarePerimeter(10)).toBe(40);
  });

  it('calculates rectangle area and perimeter correctly', () => {
    expect(calculateRectangleArea(4, 6)).toBe(24);
    expect(calculateRectanglePerimeter(4, 6)).toBe(20);
  });

  it('calculates triangle perimeter correctly', () => {
    expect(calculateTrianglePerimeter(3, 4, 5)).toBe(12);
  });

  it('calculates polygon perimeter correctly', () => {
    expect(calculatePolygonPerimeter([3, 4, 5, 6])).toBe(18);
    expect(calculatePolygonPerimeter([2, 2, 2, 2, 2])).toBe(10);
  });

  it('validates triangle inequality rule', () => {
    expect(isValidTriangle(3, 4, 5)).toBe(true);
    expect(isValidTriangle(1, 2, 5)).toBe(false);
  });

  it('calculates game points correctly', () => {
    expect(calculatePoints(false, 5)).toBe(0);
    expect(calculatePoints(true, 5)).toBe(15);
    expect(calculatePoints(true, 0)).toBe(10);
  });
});
