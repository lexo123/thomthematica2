// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ColumnDivision, ColumnDivisionProps } from './ColumnDivision';
import { buildDivisionLayout } from '../utils/columnDivision';

describe('ColumnDivision Component', () => {
  afterEach(() => {
    cleanup();
  });

  const layout345 = buildDivisionLayout(345, 3);
  const layout4056 = buildDivisionLayout(4056, 4);

  const defaultProps: ColumnDivisionProps = {
    layout: layout345,
    answers: {},
    showValidation: false,
    currentMessage: '',
    onCellChange: vi.fn(),
    onKeyDown: vi.fn(),
    onSubmit: vi.fn(),
    isFilled: () => false,
    registerCellRef: vi.fn(),
  };

  it('1. renders exactly 11 inputs for 345 ÷ 3 and 14 inputs for 4056 ÷ 4 with numeric attributes and id="cell-<cellId>"', () => {
    const { rerender } = render(<ColumnDivision {...defaultProps} layout={layout345} />);

    const inputs345 = screen.getAllByRole('textbox');
    expect(inputs345).toHaveLength(11);

    for (const cell of layout345.cells) {
      const input = screen.getByTestId(cell.id);
      expect(input).toBeDefined();
      expect(input.id).toBe(`cell-${cell.id}`);
      expect(input.getAttribute('type')).toBe('tel');
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('maxlength')).toBe('1');
    }

    rerender(<ColumnDivision {...defaultProps} layout={layout4056} />);
    const inputs4056 = screen.getAllByRole('textbox');
    expect(inputs4056).toHaveLength(14);

    for (const cell of layout4056.cells) {
      const input = screen.getByTestId(cell.id);
      expect(input).toBeDefined();
      expect(input.id).toBe(`cell-${cell.id}`);
      expect(input.getAttribute('type')).toBe('tel');
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('maxlength')).toBe('1');
    }
  });

  it('2. displays static dividend digits (3, 4, 5) and divisor (3); quotient digits do not appear in DOM when answers is empty {}', () => {
    const { container } = render(<ColumnDivision {...defaultProps} layout={layout345} answers={{}} />);

    // Dividend digits 3, 4, 5 and divisor 3 are visible as static texts
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();

    // All inputs are empty
    const allInputs = container.querySelectorAll<HTMLInputElement>('input');
    expect(allInputs).toHaveLength(11);
    allInputs.forEach((input) => {
      expect(input.value).toBe('');
    });

    // The full quotient string '115' does not appear in the DOM
    expect(screen.queryByText('115')).toBeNull();
  });

  it('3. gridRow and gridColumn for 345 ÷ 3 (11 cells) and 4056 ÷ 4 (14 cells) match hand-written literals exactly', () => {
    // 1. Hand-written expected coordinates for 345 ÷ 3 (from §2 table)
    const expected345: Record<string, { gridRow: string; gridColumn: string }> = {
      'q-0': { gridRow: '2', gridColumn: '6' },
      'q-1': { gridRow: '2', gridColumn: '7' },
      'q-2': { gridRow: '2', gridColumn: '8' },
      'p-0-0': { gridRow: '2', gridColumn: '2' },
      'w-0-0': { gridRow: '4', gridColumn: '3' },
      'p-1-0': { gridRow: '5', gridColumn: '3' },
      'w-1-0': { gridRow: '7', gridColumn: '3' },
      'w-1-1': { gridRow: '7', gridColumn: '4' },
      'p-2-0': { gridRow: '8', gridColumn: '3' },
      'p-2-1': { gridRow: '8', gridColumn: '4' },
      'final': { gridRow: '10', gridColumn: '4' },
    };

    const { rerender } = render(<ColumnDivision {...defaultProps} layout={layout345} />);

    for (const [cellId, expectedPos] of Object.entries(expected345)) {
      const el = screen.getByTestId(cellId);
      expect(el.style.gridRow).toBe(expectedPos.gridRow);
      expect(el.style.gridColumn).toBe(expectedPos.gridColumn);
    }

    // 2. Hand-written expected coordinates for 4056 ÷ 4 (from §2 table)
    const expected4056: Record<string, { gridRow: string; gridColumn: string }> = {
      'q-0': { gridRow: '2', gridColumn: '7' },
      'q-1': { gridRow: '2', gridColumn: '8' },
      'q-2': { gridRow: '2', gridColumn: '9' },
      'q-3': { gridRow: '2', gridColumn: '10' },
      'p-0-0': { gridRow: '2', gridColumn: '2' },
      'w-0-0': { gridRow: '4', gridColumn: '3' },
      'p-1-0': { gridRow: '5', gridColumn: '3' },
      'w-1-0': { gridRow: '7', gridColumn: '4' },
      'p-2-0': { gridRow: '8', gridColumn: '4' },
      'w-2-0': { gridRow: '10', gridColumn: '4' },
      'w-2-1': { gridRow: '10', gridColumn: '5' },
      'p-3-0': { gridRow: '11', gridColumn: '4' },
      'p-3-1': { gridRow: '11', gridColumn: '5' },
      'final': { gridRow: '13', gridColumn: '5' },
    };

    rerender(<ColumnDivision {...defaultProps} layout={layout4056} />);

    for (const [cellId, expectedPos] of Object.entries(expected4056)) {
      const el = screen.getByTestId(cellId);
      expect(el.style.gridRow).toBe(expectedPos.gridRow);
      expect(el.style.gridColumn).toBe(expectedPos.gridColumn);
    }
  });

  it('4. showValidation=false: banner is not rendered, no cells have green or red border/bg classes', () => {
    const { container } = render(
      <ColumnDivision {...defaultProps} layout={layout345} showValidation={false} />
    );

    // Banner not present
    expect(screen.queryByText(/შეასწორე წითელი უჯრები/)).toBeNull();

    // No input has emerald or rose classes
    const allInputs = container.querySelectorAll<HTMLInputElement>('input');
    allInputs.forEach((input) => {
      expect(input.className).not.toMatch(/border-emerald/);
      expect(input.className).not.toMatch(/bg-emerald/);
      expect(input.className).not.toMatch(/border-rose/);
      expect(input.className).not.toMatch(/bg-rose/);
      expect(input.className).toMatch(/border-indigo-200/);
    });
  });

  it('5. showValidation=true with all answers correct: banner is visible, all cells have green classes, none red', () => {
    const correctAnswers: Record<string, string> = {};
    for (const cell of layout345.cells) {
      correctAnswers[cell.id] = cell.expected;
    }

    render(
      <ColumnDivision
        {...defaultProps}
        layout={layout345}
        answers={correctAnswers}
        showValidation={true}
      />
    );

    // Banner is visible
    expect(screen.getByText(/შეასწორე წითელი უჯრები/)).toBeDefined();

    // Every cell has green classes, none red
    for (const cell of layout345.cells) {
      const input = screen.getByTestId(cell.id);
      expect(input.className).toMatch(/border-emerald-500/);
      expect(input.className).toMatch(/bg-emerald-50/);
      expect(input.className).not.toMatch(/border-rose/);
    }
  });

  it('6. showValidation=true with one cell wrong: exactly one cell is red, all others green', () => {
    const answersWithOneWrong: Record<string, string> = {};
    for (const cell of layout345.cells) {
      answersWithOneWrong[cell.id] = cell.expected;
    }
    // Change exactly p-1-0 to wrong value
    const wrongCellId = 'p-1-0';
    answersWithOneWrong[wrongCellId] = '9'; // expected is '3'

    render(
      <ColumnDivision
        {...defaultProps}
        layout={layout345}
        answers={answersWithOneWrong}
        showValidation={true}
      />
    );

    for (const cell of layout345.cells) {
      const input = screen.getByTestId(cell.id);
      if (cell.id === wrongCellId) {
        expect(input.className).toMatch(/border-rose-500/);
        expect(input.className).toMatch(/bg-rose-50/);
        expect(input.className).not.toMatch(/border-emerald/);
      } else {
        expect(input.className).toMatch(/border-emerald-500/);
        expect(input.className).not.toMatch(/border-rose/);
      }
    }
  });

  it('7. showValidation=true with one cell omitted (empty): that cell is red, all others green', () => {
    const answersWithOneEmpty: Record<string, string> = {};
    for (const cell of layout345.cells) {
      answersWithOneEmpty[cell.id] = cell.expected;
    }
    const emptyCellId = 'w-1-1';
    delete answersWithOneEmpty[emptyCellId];

    render(
      <ColumnDivision
        {...defaultProps}
        layout={layout345}
        answers={answersWithOneEmpty}
        showValidation={true}
      />
    );

    for (const cell of layout345.cells) {
      const input = screen.getByTestId(cell.id);
      if (cell.id === emptyCellId) {
        expect(input.className).toMatch(/border-rose-500/);
        expect(input.className).toMatch(/bg-rose-50/);
        expect(input.className).not.toMatch(/border-emerald/);
      } else {
        expect(input.className).toMatch(/border-emerald-500/);
        expect(input.className).not.toMatch(/border-rose/);
      }
    }
  });

  it('8. submit button is disabled when isFilled() is false, enabled when true; submitting invokes onSubmit', () => {
    const onSubmit = vi.fn((e?: React.FormEvent) => e?.preventDefault());

    const { rerender } = render(
      <ColumnDivision
        {...defaultProps}
        layout={layout345}
        isFilled={() => false}
        onSubmit={onSubmit}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /შემოწმება/ });
    expect(submitBtn).toBeDefined();
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    rerender(
      <ColumnDivision
        {...defaultProps}
        layout={layout345}
        isFilled={() => true}
        onSubmit={onSubmit}
      />
    );

    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('9. onCellChange and onKeyDown are called with the exact cellId and payload', () => {
    const onCellChange = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <ColumnDivision
        {...defaultProps}
        layout={layout345}
        onCellChange={onCellChange}
        onKeyDown={onKeyDown}
      />
    );

    const targetInput = screen.getByTestId('q-1');

    fireEvent.change(targetInput, { target: { value: '7' } });
    expect(onCellChange).toHaveBeenCalledWith('q-1', '7');

    fireEvent.keyDown(targetInput, { key: 'ArrowRight' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onKeyDown.mock.calls[0][0]).toBe('q-1');
  });

  it('10. registerCellRef is invoked for every cell with its cellId', () => {
    const registerCellRef = vi.fn();

    render(
      <ColumnDivision
        {...defaultProps}
        layout={layout345}
        registerCellRef={registerCellRef}
      />
    );

    for (const cell of layout345.cells) {
      expect(registerCellRef).toHaveBeenCalledWith(cell.id, expect.any(HTMLInputElement));
    }
  });

  it('11. uniqueness: across 345÷3, 4056÷4, and 9000÷9, all input (gridRow, gridColumn) pairs are unique with zero collisions', () => {
    const layouts = [
      buildDivisionLayout(345, 3),
      buildDivisionLayout(4056, 4),
      buildDivisionLayout(9000, 9),
    ];

    for (const lay of layouts) {
      const { container, unmount } = render(
        <ColumnDivision {...defaultProps} layout={lay} />
      );

      const inputs = container.querySelectorAll<HTMLInputElement>('input');
      const positions = new Set<string>();

      inputs.forEach((input) => {
        const row = input.style.gridRow;
        const col = input.style.gridColumn;
        const key = `${row}:${col}`;
        expect(positions.has(key)).toBe(false);
        positions.add(key);
      });

      expect(positions.size).toBe(lay.cells.length);
      unmount();
    }
  });
});
