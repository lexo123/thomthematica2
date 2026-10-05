// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnDivision, DIVISION_CELL_FOCUS_DELAY_MS } from './useColumnDivision';
import { buildDivisionLayout } from '../utils/columnDivision';

describe('useColumnDivision', () => {
  const layout345 = buildDivisionLayout(345, 3);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  type MockInputElement = HTMLInputElement & {
    focus: any;
    select: any;
  };

  const setupMockInputs = (
    registerCellRef: (id: string, el: HTMLInputElement | null) => void,
    ids: string[]
  ) => {
    const inputs: Record<string, MockInputElement> = {};
    for (const id of ids) {
      const el = document.createElement('input') as unknown as MockInputElement;
      el.focus = vi.fn();
      el.select = vi.fn();
      inputs[id] = el;
      registerCellRef(id, el);
    }
    return inputs;
  };

  it('1. solvingSequence for 345 ÷ 3 matches exact hand-written literal', () => {
    expect(layout345.solvingSequence).toEqual([
      'q-0',
      'p-0-0',
      'w-0-0',
      'q-1',
      'p-1-0',
      'w-1-0',
      'w-1-1',
      'q-2',
      'p-2-0',
      'p-2-1',
      'final',
    ]);
  });

  it('2. entering a digit on q-0 stores value and schedules focus to p-0-0', () => {
    const { result } = renderHook(() => useColumnDivision(layout345));
    const inputs = setupMockInputs(result.current.registerCellRef, layout345.solvingSequence);

    act(() => {
      result.current.handleCellChange('q-0', '1');
    });

    expect(result.current.answers['q-0']).toBe('1');
    expect(inputs['p-0-0'].focus).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DIVISION_CELL_FOCUS_DELAY_MS);
    });

    expect(inputs['p-0-0'].focus).toHaveBeenCalledTimes(1);
    expect(inputs['p-0-0'].select).toHaveBeenCalledTimes(1);
  });

  it('3. entering a digit on the final cell (final) does not advance focus anywhere', () => {
    const { result } = renderHook(() => useColumnDivision(layout345));
    const inputs = setupMockInputs(result.current.registerCellRef, layout345.solvingSequence);

    act(() => {
      result.current.handleCellChange('final', '0');
    });

    expect(result.current.answers['final']).toBe('0');

    act(() => {
      vi.advanceTimersByTime(DIVISION_CELL_FOCUS_DELAY_MS * 2);
    });

    for (const id of layout345.solvingSequence) {
      expect(inputs[id].focus).not.toHaveBeenCalled();
    }
  });

  it('4. non-digits are ignored, two characters keep only the last, and empty string clears', () => {
    const { result } = renderHook(() => useColumnDivision(layout345));

    // Non-digit input: letters, dashes, spaces ignored
    act(() => {
      result.current.handleCellChange('q-0', 'a');
    });
    expect(result.current.answers['q-0']).toBeUndefined();

    act(() => {
      result.current.handleCellChange('q-0', '-');
    });
    expect(result.current.answers['q-0']).toBeUndefined();

    act(() => {
      result.current.handleCellChange('q-0', ' ');
    });
    expect(result.current.answers['q-0']).toBeUndefined();

    // Two characters: keeps the last character ('12' -> '2')
    act(() => {
      result.current.handleCellChange('q-0', '12');
    });
    expect(result.current.answers['q-0']).toBe('2');

    // Empty string clears value to ''
    act(() => {
      result.current.handleCellChange('q-0', '');
    });
    expect(result.current.answers['q-0']).toBe('');
  });

  it('5. Backspace behavior: non-empty clears current cell; empty clears and moves focus to previous cell; empty first cell does nothing', () => {
    const { result } = renderHook(() => useColumnDivision(layout345));
    const inputs = setupMockInputs(result.current.registerCellRef, layout345.solvingSequence);

    // Populate q-0 and p-0-0
    act(() => {
      result.current.handleCellChange('q-0', '1');
      result.current.handleCellChange('p-0-0', '3');
    });

    const preventDefault = vi.fn();

    // 1. Backspace on non-empty p-0-0: only p-0-0 is cleared, focus does not move
    act(() => {
      result.current.handleKeyDown('p-0-0', {
        key: 'Backspace',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.answers['p-0-0']).toBe('');
    expect(result.current.answers['q-0']).toBe('1');
    expect(inputs['q-0'].focus).not.toHaveBeenCalled();

    // 2. Backspace on empty p-0-0: clears previous cell q-0 and moves focus to q-0
    act(() => {
      result.current.handleKeyDown('p-0-0', {
        key: 'Backspace',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(result.current.answers['q-0']).toBe('');

    act(() => {
      vi.advanceTimersByTime(DIVISION_CELL_FOCUS_DELAY_MS);
    });

    expect(inputs['q-0'].focus).toHaveBeenCalledTimes(1);

    // 3. Backspace on empty first cell (q-0): does nothing, no error
    act(() => {
      result.current.handleKeyDown('q-0', {
        key: 'Backspace',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(result.current.answers['q-0']).toBe('');
  });

  it('6. Enter on middle cell advances focus without calling submitHandler; Enter on final cell calls submitHandler and stops propagation if true', () => {
    const { result } = renderHook(() => useColumnDivision(layout345));
    const inputs = setupMockInputs(result.current.registerCellRef, layout345.solvingSequence);

    const submitMock = vi.fn().mockReturnValue(true);
    result.current.registerSubmitHandler(submitMock);

    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    // Enter on middle cell (q-1) -> advances focus to p-1-0, submit not called
    act(() => {
      result.current.handleKeyDown('q-1', {
        key: 'Enter',
        preventDefault,
        stopPropagation,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(submitMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(DIVISION_CELL_FOCUS_DELAY_MS);
    });
    expect(inputs['p-1-0'].focus).toHaveBeenCalledTimes(1);

    // Enter on final cell -> calls submitHandler
    act(() => {
      result.current.handleKeyDown('final', {
        key: 'Enter',
        preventDefault,
        stopPropagation,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);

    // If submitHandler returns false, stopPropagation is not called
    submitMock.mockReturnValue(false);
    stopPropagation.mockClear();

    act(() => {
      result.current.handleKeyDown('final', {
        key: 'Enter',
        preventDefault,
        stopPropagation,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(submitMock).toHaveBeenCalledTimes(2);
    expect(stopPropagation).not.toHaveBeenCalled();
  });

  it('7. Arrow keys: ArrowRight/ArrowDown move to next cell; ArrowLeft/ArrowUp move to previous cell without clearing values', () => {
    const { result } = renderHook(() => useColumnDivision(layout345));
    const inputs = setupMockInputs(result.current.registerCellRef, layout345.solvingSequence);

    const preventDefault = vi.fn();

    // ArrowRight on q-0 -> moves to p-0-0 immediately
    act(() => {
      result.current.handleKeyDown('q-0', {
        key: 'ArrowRight',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    expect(inputs['p-0-0'].focus).toHaveBeenCalledTimes(1);

    // ArrowDown on p-0-0 -> moves to w-0-0
    act(() => {
      result.current.handleKeyDown('p-0-0', {
        key: 'ArrowDown',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    expect(inputs['w-0-0'].focus).toHaveBeenCalledTimes(1);

    // ArrowLeft on w-0-0 -> moves back to p-0-0
    act(() => {
      result.current.handleKeyDown('w-0-0', {
        key: 'ArrowLeft',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    expect(inputs['p-0-0'].focus).toHaveBeenCalledTimes(2);

    // ArrowUp on p-0-0 -> moves back to q-0
    act(() => {
      result.current.handleKeyDown('p-0-0', {
        key: 'ArrowUp',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    expect(inputs['q-0'].focus).toHaveBeenCalledTimes(1);

    // Boundaries: ArrowLeft on q-0 does nothing
    inputs['q-0'].focus.mockClear();
    act(() => {
      result.current.handleKeyDown('q-0', {
        key: 'ArrowLeft',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    expect(inputs['q-0'].focus).not.toHaveBeenCalled();

    // Boundary: ArrowRight on final does nothing
    inputs['final'].focus.mockClear();
    act(() => {
      result.current.handleKeyDown('final', {
        key: 'ArrowRight',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    expect(inputs['final'].focus).not.toHaveBeenCalled();
  });

  it('8. isDivisionFilled returns false initially, true after single digit entered, false after cleared, false when layout is null', () => {
    const { result, rerender } = renderHook(
      ({ lay }) => useColumnDivision(lay),
      { initialProps: { lay: layout345 as typeof layout345 | null } }
    );

    // Fresh: false
    expect(result.current.isDivisionFilled()).toBe(false);

    // One cell filled: true
    act(() => {
      result.current.handleCellChange('q-0', '1');
    });
    expect(result.current.isDivisionFilled()).toBe(true);

    // Cleared: false
    act(() => {
      result.current.handleCellChange('q-0', '');
    });
    expect(result.current.isDivisionFilled()).toBe(false);

    // When layout is null: false
    rerender({ lay: null });
    expect(result.current.isDivisionFilled()).toBe(false);
  });

  it('9. resetDivisionState clears answers, showDivisionValidation, and hasFailedThisDivision', () => {
    const { result } = renderHook(() => useColumnDivision(layout345));

    act(() => {
      result.current.handleCellChange('q-0', '1');
      result.current.setShowDivisionValidation(true);
      result.current.setHasFailedThisDivision(true);
    });

    expect(result.current.answers['q-0']).toBe('1');
    expect(result.current.showDivisionValidation).toBe(true);
    expect(result.current.hasFailedThisDivision).toBe(true);

    act(() => {
      result.current.resetDivisionState();
    });

    expect(result.current.answers).toEqual({});
    expect(result.current.showDivisionValidation).toBe(false);
    expect(result.current.hasFailedThisDivision).toBe(false);
  });

  it('10. handleCellChange and handleKeyDown do not throw when layout is null', () => {
    const { result } = renderHook(() => useColumnDivision(null));

    expect(() => {
      act(() => {
        result.current.handleCellChange('q-0', '1');
      });
    }).not.toThrow();

    expect(() => {
      act(() => {
        result.current.handleKeyDown('q-0', {
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>);
      });
    }).not.toThrow();
  });

  it('11. Enter and Space on empty current cell advance to next cell; Space on final cell does nothing and does not trigger submitHandler', () => {
    const { result } = renderHook(() => useColumnDivision(layout345));
    const inputs = setupMockInputs(result.current.registerCellRef, layout345.solvingSequence);

    const submitMock = vi.fn();
    result.current.registerSubmitHandler(submitMock);

    const preventDefault = vi.fn();

    // Enter on empty q-0 -> moves to p-0-0
    act(() => {
      result.current.handleKeyDown('q-0', {
        key: 'Enter',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    act(() => {
      vi.advanceTimersByTime(DIVISION_CELL_FOCUS_DELAY_MS);
    });
    expect(inputs['p-0-0'].focus).toHaveBeenCalledTimes(1);

    // Space on empty p-0-0 -> moves to w-0-0
    act(() => {
      result.current.handleKeyDown('p-0-0', {
        key: ' ',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    act(() => {
      vi.advanceTimersByTime(DIVISION_CELL_FOCUS_DELAY_MS);
    });
    expect(inputs['w-0-0'].focus).toHaveBeenCalledTimes(1);

    // Space on final cell does nothing and does not call submitHandler
    act(() => {
      result.current.handleKeyDown('final', {
        key: ' ',
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    act(() => {
      vi.advanceTimersByTime(DIVISION_CELL_FOCUS_DELAY_MS);
    });
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('12. Rapid successive input cancels previous focus timers and only focuses the last scheduled cell; unmount cancels pending timer without error', () => {
    const { result, unmount } = renderHook(() => useColumnDivision(layout345));
    const inputs = setupMockInputs(result.current.registerCellRef, layout345.solvingSequence);

    // Type in q-0 (schedules focus to p-0-0 in 10ms)
    act(() => {
      result.current.handleCellChange('q-0', '1');
    });

    // Advance only 3ms (< 10ms)
    act(() => {
      vi.advanceTimersByTime(3);
    });
    expect(inputs['p-0-0'].focus).not.toHaveBeenCalled();

    // Immediately type in p-0-0 (should cancel p-0-0 focus and schedule w-0-0 focus)
    act(() => {
      result.current.handleCellChange('p-0-0', '3');
    });

    // Advance 10ms
    act(() => {
      vi.advanceTimersByTime(10);
    });

    // p-0-0 was cancelled and never focused
    expect(inputs['p-0-0'].focus).not.toHaveBeenCalled();
    // w-0-0 was focused
    expect(inputs['w-0-0'].focus).toHaveBeenCalledTimes(1);

    // Test unmount cleanup
    act(() => {
      result.current.handleCellChange('w-0-0', '4');
    });
    unmount();

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(DIVISION_CELL_FOCUS_DELAY_MS * 2);
      });
    }).not.toThrow();

    expect(inputs['q-1'].focus).not.toHaveBeenCalled();
  });
});
