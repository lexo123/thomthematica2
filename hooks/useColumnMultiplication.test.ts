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
    const preventDefaultSpy = vi.fn();
    const stopPropagationSpy = vi.fn();
    act(() => {
      result.current.handleKeyDown(lastCell.row, lastCell.col, {
        key: 'Enter',
        preventDefault: preventDefaultSpy,
        stopPropagation: stopPropagationSpy,
      } as any);
    });

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it('stops propagation on final-cell Enter so the event does not reach the global ResultOverlay Enter handler', () => {
    const { result } = renderHook(() => useColumnMultiplication(mockProblem));

    const submitSpy = vi.fn();
    act(() => {
      result.current.registerSubmitHandler(submitSpy);
    });

    const sequence = getSolvingSequence(mockProblem);
    const lastCell = sequence[sequence.length - 1];

    // Simulate global ResultOverlay keydown listener on window
    const globalResultOverlayEnterHandler = vi.fn();
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        globalResultOverlayEnterHandler();
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown);

    // Create an input in the DOM and attach handleKeyDown to it
    const input = document.createElement('input');
    document.body.appendChild(input);

    input.addEventListener('keydown', (e) => {
      result.current.handleKeyDown(lastCell.row, lastCell.col, e as any);
    });

    // Dispatch keyboard Enter event from the input element
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(enterEvent);

    // 1. Enter submitted the answer
    expect(submitSpy).toHaveBeenCalledTimes(1);
    // 2. default was prevented
    expect(enterEvent.defaultPrevented).toBe(true);
    // 3. Propagation was stopped, so global ResultOverlay listener on window was NOT called
    expect(globalResultOverlayEnterHandler).not.toHaveBeenCalled();

    window.removeEventListener('keydown', handleWindowKeyDown);
    document.body.removeChild(input);
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
