// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnMultiplication } from './useColumnMultiplication';
import { MathProblem, Operation } from '../types';
import { getSolvingSequence } from '../utils/columnMultiplication';

describe('useColumnMultiplication - registerSubmitHandler and Enter key behavior', () => {
  const mockProblem: MathProblem = {
    category: 'math',
    operation: Operation.Multiply,
    num1: 23,
    num2: 4,
    answer: 92,
  };

  it('provides registerSubmitHandler and executes the registered callback on Enter in final cell', () => {
    const { result } = renderHook(() => useColumnMultiplication(mockProblem));

    const submitSpy = vi.fn();
    act(() => {
      result.current.registerSubmitHandler(submitSpy);
    });

    // In solving sequence, final cell is sequence[sequence.length - 1]
    const sequence = getSolvingSequence(mockProblem);
    const lastCell = sequence[sequence.length - 1];

    // When Enter is pressed on a non-final cell, submitSpy is NOT called:
    act(() => {
      result.current.handleKeyDown(sequence[0].row, sequence[0].col, {
        key: 'Enter',
        preventDefault: vi.fn(),
      } as any);
    });
    expect(submitSpy).not.toHaveBeenCalled();

    // When Enter is pressed on the final cell:
    act(() => {
      result.current.handleKeyDown(lastCell.row, lastCell.col, {
        key: 'Enter',
        preventDefault: vi.fn(),
      } as any);
    });

    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('does not trigger submit handler if key is Space on final cell', () => {
    const { result } = renderHook(() => useColumnMultiplication(mockProblem));

    const submitSpy = vi.fn();
    act(() => {
      result.current.registerSubmitHandler(submitSpy);
    });

    act(() => {
      result.current.handleKeyDown('res', 2, {
        key: ' ',
        preventDefault: vi.fn(),
      } as any);
    });

    expect(submitSpy).not.toHaveBeenCalled();
  });
});
