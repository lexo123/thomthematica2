import React, { useState, useCallback, useRef } from 'react';
import { ColMultState, MathProblem } from '../types';
import { getSolvingSequence } from '../utils/columnMultiplication';

/** 
 * Delay (ms) before auto-focusing the next input cell after digit entry,
 * backspace, or navigation key press. Gives React time to commit state changes.
 */
export const CELL_FOCUS_DELAY_MS = 10;

export const INITIAL_COL_MULT_STATE: ColMultState = {
  r1: ['', '', '', ''],
  r2: ['', '', '', ''],
  res: ['', '', '', '']
};

export const useColumnMultiplication = (problem: MathProblem | null) => {
  const [colMultState, setColMultState] = useState<ColMultState>(INITIAL_COL_MULT_STATE);
  const [showKveshValidation, setShowKveshValidation] = useState<boolean>(false);
  const [hasKveshFailedThisQuestion, setHasKveshFailedThisQuestion] = useState<boolean>(false);

  // React Ref Map for idiomatic input cell focus management without DOM getElementById
  const cellRefsMap = useRef<Map<string, HTMLInputElement>>(new Map());

  const registerCellRef = useCallback((row: string, colIndex: number, el: HTMLInputElement | null) => {
    const key = `${row}-${colIndex}`;
    if (el) {
      cellRefsMap.current.set(key, el);
    } else {
      cellRefsMap.current.delete(key);
    }
  }, []);

  const focusCell = useCallback((row: string, colIndex: number) => {
    const key = `${row}-${colIndex}`;
    const el = cellRefsMap.current.get(key);
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const focusFirstCell = useCallback((prob: MathProblem) => {
    const sequence = getSolvingSequence(prob);
    if (sequence.length > 0) {
      const firstCell = sequence[0];
      focusCell(firstCell.row, firstCell.col);
    }
  }, [focusCell]);

  const resetColMultState = useCallback(() => {
    setColMultState({
      r1: ['', '', '', ''],
      r2: ['', '', '', ''],
      res: ['', '', '', '']
    });
    setShowKveshValidation(false);
    setHasKveshFailedThisQuestion(false);
  }, []);

  const isColMultFilled = useCallback(() => {
    if (!problem) return false;
    return colMultState.r1.some(v => v !== '') || 
           colMultState.r2.some(v => v !== '') || 
           colMultState.res.some(v => v !== '');
  }, [problem, colMultState]);

  const handleCellChange = useCallback((row: 'r1' | 'r2' | 'res', colIndex: number, val: string) => {
    if (val === '') {
      setColMultState(prev => ({
        ...prev,
        [row]: prev[row].map((c, idx) => idx === colIndex ? '' : c)
      }));
      return;
    }

    const digit = val.slice(-1);
    if (!/^[0-9]$/.test(digit)) return;

    setColMultState(prev => ({
      ...prev,
      [row]: prev[row].map((c, idx) => idx === colIndex ? digit : c)
    }));

    if (digit !== "" && problem) {
      const sequence = getSolvingSequence(problem);
      const currentIndex = sequence.findIndex(item => item.row === row && item.col === colIndex);
      if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
        const nextCell = sequence[currentIndex + 1];
        setTimeout(() => {
          focusCell(nextCell.row, nextCell.col);
        }, CELL_FOCUS_DELAY_MS);
      }
    }
  }, [problem, focusCell]);

  const handleKeyDown = useCallback((row: 'r1' | 'r2' | 'res', colIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      if (colMultState[row][colIndex] !== '') {
        setColMultState(prev => ({
          ...prev,
          [row]: prev[row].map((c, idx) => idx === colIndex ? '' : c)
        }));
        return;
      }

      if (problem) {
        const sequence = getSolvingSequence(problem);
        const currentIndex = sequence.findIndex(item => item.row === row && item.col === colIndex);
        if (currentIndex > 0) {
          const prevCell = sequence[currentIndex - 1];
          setColMultState(prev => ({
            ...prev,
            [prevCell.row]: prev[prevCell.row].map((c, idx) => idx === prevCell.col ? '' : c)
          }));
          setTimeout(() => {
            focusCell(prevCell.row, prevCell.col);
          }, CELL_FOCUS_DELAY_MS);
        }
      }
      return;
    }

    if ((e.key === 'Enter' || e.key === ' ') && problem) {
      e.preventDefault();
      const sequence = getSolvingSequence(problem);
      const currentIndex = sequence.findIndex(item => item.row === row && item.col === colIndex);
      if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
        const nextCell = sequence[currentIndex + 1];
        setTimeout(() => {
          focusCell(nextCell.row, nextCell.col);
        }, CELL_FOCUS_DELAY_MS);
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (colIndex > 0) {
        focusCell(row, colIndex - 1);
      } else {
        const nextRow = row === 'r1' ? 'r2' : row === 'r2' ? 'res' : null;
        if (nextRow) {
          focusCell(nextRow, 3);
        }
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (colIndex < 3) {
        focusCell(row, colIndex + 1);
      } else {
        const prevRow = row === 'res' ? 'r2' : row === 'r2' ? 'r1' : null;
        if (prevRow) {
          focusCell(prevRow, 0);
        }
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = row === 'res' ? 'r2' : row === 'r2' ? 'r1' : null;
      if (prevRow) {
        focusCell(prevRow, colIndex);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = row === 'r1' ? 'r2' : row === 'r2' ? 'res' : null;
      if (nextRow) {
        focusCell(nextRow, colIndex);
      }
      return;
    }
  }, [problem, colMultState, focusCell]);

  return {
    colMultState,
    setColMultState,
    showKveshValidation,
    setShowKveshValidation,
    hasKveshFailedThisQuestion,
    setHasKveshFailedThisQuestion,
    handleCellChange,
    handleKeyDown,
    isColMultFilled,
    resetColMultState,
    registerCellRef,
    focusFirstCell
  };
};
