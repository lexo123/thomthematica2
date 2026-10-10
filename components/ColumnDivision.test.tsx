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
  const layout215 = buildDivisionLayout(215, 5);

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

  it('1. renders exactly 13 inputs for 345 ÷ 3, 18 inputs for 4056 ÷ 4, and 10 inputs for 215 ÷ 5 with numeric attributes and id="cell-<cellId>"', () => {
    const { rerender } = render(<ColumnDivision {...defaultProps} layout={layout345} />);

    const inputs345 = screen.getAllByRole('textbox');
    expect(inputs345).toHaveLength(13);

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
    expect(inputs4056).toHaveLength(18);

    for (const cell of layout4056.cells) {
      const input = screen.getByTestId(cell.id);
      expect(input).toBeDefined();
      expect(input.id).toBe(`cell-${cell.id}`);
      expect(input.getAttribute('type')).toBe('tel');
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('maxlength')).toBe('1');
    }

    rerender(<ColumnDivision {...defaultProps} layout={layout215} />);
    const inputs215 = screen.getAllByRole('textbox');
    expect(inputs215).toHaveLength(10);

    for (const cell of layout215.cells) {
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
    expect(allInputs).toHaveLength(13);
    allInputs.forEach((input) => {
      expect(input.value).toBe('');
    });

    // The full quotient string '115' does not appear in the DOM
    expect(screen.queryByText('115')).toBeNull();
  });

  it('3. gridRow and gridColumn for 345 ÷ 3 (13 cells), 4056 ÷ 4 (18 cells), and 215 ÷ 5 (10 cells with s-0 at (2,8)) match hand-written literals exactly', () => {
    // 1. Hand-written expected coordinates for 345 ÷ 3 (from §3 table)
    const expected345: Record<string, { gridRow: string; gridColumn: string }> = {
      'q-0': { gridRow: '2', gridColumn: '6' },
      'q-1': { gridRow: '2', gridColumn: '7' },
      'q-2': { gridRow: '2', gridColumn: '8' },
      'p-0-0': { gridRow: '2', gridColumn: '2' },
      'w-0-0': { gridRow: '4', gridColumn: '2' },
      'w-0-1': { gridRow: '4', gridColumn: '3' },
      'p-1-0': { gridRow: '5', gridColumn: '2' },
      'p-1-1': { gridRow: '5', gridColumn: '3' },
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

    // 2. Hand-written expected coordinates for 4056 ÷ 4 (from §3 table)
    const expected4056: Record<string, { gridRow: string; gridColumn: string }> = {
      'q-0': { gridRow: '2', gridColumn: '7' },
      'q-1': { gridRow: '2', gridColumn: '8' },
      'q-2': { gridRow: '2', gridColumn: '9' },
      'q-3': { gridRow: '2', gridColumn: '10' },
      'p-0-0': { gridRow: '2', gridColumn: '2' },
      'w-0-0': { gridRow: '4', gridColumn: '2' },
      'w-0-1': { gridRow: '4', gridColumn: '3' },
      'p-1-0': { gridRow: '5', gridColumn: '2' },
      'p-1-1': { gridRow: '5', gridColumn: '3' },
      'w-1-0': { gridRow: '7', gridColumn: '3' },
      'w-1-1': { gridRow: '7', gridColumn: '4' },
      'p-2-0': { gridRow: '8', gridColumn: '3' },
      'p-2-1': { gridRow: '8', gridColumn: '4' },
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

    // 3. Hand-written expected coordinates for 215 ÷ 5 (from §3 table, s-0 is at (2,8))
    const expected215: Record<string, { gridRow: string; gridColumn: string }> = {
      'q-0': { gridRow: '2', gridColumn: '6' },
      'q-1': { gridRow: '2', gridColumn: '7' },
      's-0': { gridRow: '2', gridColumn: '8' },
      'p-0-0': { gridRow: '2', gridColumn: '2' },
      'p-0-1': { gridRow: '2', gridColumn: '3' },
      'w-0-0': { gridRow: '4', gridColumn: '3' },
      'w-0-1': { gridRow: '4', gridColumn: '4' },
      'p-1-0': { gridRow: '5', gridColumn: '3' },
      'p-1-1': { gridRow: '5', gridColumn: '4' },
      'final': { gridRow: '7', gridColumn: '4' },
    };

    rerender(<ColumnDivision {...defaultProps} layout={layout215} />);

    for (const [cellId, expectedPos] of Object.entries(expected215)) {
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

  it('5. showValidation=true with all answers filled and correct: banner is visible, all cells have green classes, none red', () => {
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

    expect(screen.getByText(/შეასწორე წითელი უჯრები/)).toBeDefined();

    for (const cell of layout345.cells) {
      const input = screen.getByTestId(cell.id);
      expect(input.className).toMatch(/border-emerald-500/);
      expect(input.className).toMatch(/bg-emerald-50/);
      expect(input.className).not.toMatch(/border-rose/);
    }
  });

  it('5b. showValidation=true with only required cells filled: required cells are green, empty optional cells are neutral (not green, not red)', () => {
    const onlyRequiredAnswers: Record<string, string> = {};
    for (const cell of layout345.cells) {
      if (cell.rule === 'required') {
        onlyRequiredAnswers[cell.id] = cell.expected;
      }
    }

    render(
      <ColumnDivision
        {...defaultProps}
        layout={layout345}
        answers={onlyRequiredAnswers}
        showValidation={true}
      />
    );

    for (const cell of layout345.cells) {
      const input = screen.getByTestId(cell.id);
      if (cell.rule === 'required') {
        expect(input.className).toMatch(/border-emerald-500/);
        expect(input.className).toMatch(/bg-emerald-50/);
        expect(input.className).not.toMatch(/border-rose/);
      } else {
        // Empty optional cell remains neutral
        expect(input.className).toMatch(/border-indigo-200/);
        expect(input.className).not.toMatch(/border-emerald/);
        expect(input.className).not.toMatch(/border-rose/);
      }
    }
  });

  it('6. showValidation=true with one cell wrong: that cell is red, others are green or neutral', () => {
    const answersWithOneWrong: Record<string, string> = {};
    for (const cell of layout345.cells) {
      answersWithOneWrong[cell.id] = cell.expected;
    }
    const wrongCellId = 'p-1-1';
    answersWithOneWrong[wrongCellId] = '9'; // expected '3'

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

  it('7. showValidation=true with one required cell omitted: that required cell is red', () => {
    const answersWithOneEmpty: Record<string, string> = {};
    for (const cell of layout345.cells) {
      answersWithOneEmpty[cell.id] = cell.expected;
    }
    const emptyCellId = 'w-1-1'; // required cell
    expect(layout345.cells.find((c) => c.id === emptyCellId)?.rule).toBe('required');
    delete answersWithOneEmpty[emptyCellId];

    render(
      <ColumnDivision
        {...defaultProps}
        layout={layout345}
        answers={answersWithOneEmpty}
        showValidation={true}
      />
    );

    const emptyInput = screen.getByTestId(emptyCellId);
    expect(emptyInput.className).toMatch(/border-rose-500/);
    expect(emptyInput.className).toMatch(/bg-rose-50/);
    expect(emptyInput.className).not.toMatch(/border-emerald/);
  });

  it('8. validation styling for optional and spare cells: optional empty -> neutral, optional wrong -> red, optional correct -> green, spare with "0" -> red, spare empty -> neutral', () => {
    // Test with 215 ÷ 5 which has spare cell 's-0' and optional cells ('final', etc.)
    const answers: Record<string, string> = {};
    for (const cell of layout215.cells) {
      if (cell.rule === 'required') {
        answers[cell.id] = cell.expected;
      }
    }
    // Set final (optional) with correct value '0'
    answers['final'] = '0';
    // Leave p-1-0 (optional) empty
    delete answers['p-1-0'];
    // Leave s-0 (spare) empty
    delete answers['s-0'];

    const { rerender } = render(
      <ColumnDivision
        {...defaultProps}
        layout={layout215}
        answers={answers}
        showValidation={true}
      />
    );

    // final: optional with correct digit -> green
    const finalInput = screen.getByTestId('final');
    expect(finalInput.className).toMatch(/border-emerald-500/);

    // p-1-0: optional and empty -> neutral
    const p10Input = screen.getByTestId('p-1-0');
    expect(p10Input.className).toMatch(/border-indigo-200/);
    expect(p10Input.className).not.toMatch(/border-emerald/);
    expect(p10Input.className).not.toMatch(/border-rose/);

    // s-0: spare and empty -> neutral
    const s0Input = screen.getByTestId('s-0');
    expect(s0Input.className).toMatch(/border-indigo-200/);
    expect(s0Input.className).not.toMatch(/border-rose/);

    // Now set optional p-1-0 with WRONG digit '7' and spare s-0 with '0'
    rerender(
      <ColumnDivision
        {...defaultProps}
        layout={layout215}
        answers={{
          ...answers,
          'p-1-0': '7',
          's-0': '0',
        }}
        showValidation={true}
      />
    );

    // p-1-0 with wrong digit -> red
    expect(screen.getByTestId('p-1-0').className).toMatch(/border-rose-500/);
    // s-0 with '0' -> red
    expect(screen.getByTestId('s-0').className).toMatch(/border-rose-500/);
  });

  it('9. all cells (including spare and optional) have identical type, inputMode, maxLength, placeholder, and identical className when showValidation=false', () => {
    const { container } = render(
      <ColumnDivision {...defaultProps} layout={layout215} showValidation={false} />
    );

    const inputs = container.querySelectorAll<HTMLInputElement>('input');
    expect(inputs).toHaveLength(10);

    const referenceClassName = inputs[0].className;
    expect(referenceClassName).toMatch(/border-indigo-200/);

    inputs.forEach((input) => {
      expect(input.getAttribute('type')).toBe('tel');
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('maxlength')).toBe('1');
      expect(input.getAttribute('placeholder')).toBe('?');
      expect(input.className).toBe(referenceClassName);
      // No special rule data-attribute
      expect(input.getAttribute('data-rule')).toBeNull();
    });
  });

  it('10. submit button is disabled when isFilled() is false, enabled when true; submitting invokes onSubmit', () => {
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

  it('11. onCellChange and onKeyDown are called with the exact cellId and payload', () => {
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

  it('12. registerCellRef is invoked for every cell with its cellId', () => {
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

  it('13. uniqueness: across 345÷3, 4056÷4, 9000÷9, and 215÷5, all input (gridRow, gridColumn) pairs are unique with zero collisions', () => {
    const layouts = [
      buildDivisionLayout(345, 3),
      buildDivisionLayout(4056, 4),
      buildDivisionLayout(9000, 9),
      buildDivisionLayout(215, 5),
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
