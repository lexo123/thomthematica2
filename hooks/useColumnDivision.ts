import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DivisionLayout } from '../utils/columnDivision';

export const DIVISION_CELL_FOCUS_DELAY_MS = 10;

export const useColumnDivision = (layout: DivisionLayout | null) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showDivisionValidation, setShowDivisionValidation] = useState<boolean>(false);
  const [hasFailedThisDivision, setHasFailedThisDivision] = useState<boolean>(false);

  const cellRefsMap = useRef<Map<string, HTMLInputElement>>(new Map());
  const submitHandlerRef = useRef<(() => boolean) | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending focus timeout on unmount
  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current !== null) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, []);

  const registerSubmitHandler = useCallback((fn: () => boolean) => {
    submitHandlerRef.current = fn;
  }, []);

  const registerCellRef = useCallback((id: string, el: HTMLInputElement | null) => {
    if (el) {
      cellRefsMap.current.set(id, el);
    } else {
      cellRefsMap.current.delete(id);
    }
  }, []);

  const focusCell = useCallback((id: string) => {
    const el = cellRefsMap.current.get(id);
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const scheduleFocus = useCallback(
    (id: string) => {
      if (focusTimeoutRef.current !== null) {
        clearTimeout(focusTimeoutRef.current);
      }
      focusTimeoutRef.current = setTimeout(() => {
        focusTimeoutRef.current = null;
        focusCell(id);
      }, DIVISION_CELL_FOCUS_DELAY_MS);
    },
    [focusCell]
  );

  const focusFirstCell = useCallback(
    (targetLayout: DivisionLayout) => {
      if (targetLayout && targetLayout.solvingSequence.length > 0) {
        focusCell(targetLayout.solvingSequence[0]);
      }
    },
    [focusCell]
  );

  const resetDivisionState = useCallback(() => {
    setAnswers({});
    setShowDivisionValidation(false);
    setHasFailedThisDivision(false);
    if (focusTimeoutRef.current !== null) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
  }, []);

  const isDivisionFilled = useCallback(() => {
    if (!layout) return false;
    return Object.values(answers).some((val) => val !== '');
  }, [layout, answers]);

  const handleCellChange = useCallback(
    (id: string, val: string) => {
      if (!layout) return;

      if (val === '') {
        setAnswers((prev) => ({
          ...prev,
          [id]: '',
        }));
        return;
      }

      const digit = val.slice(-1);
      if (!/^[0-9]$/.test(digit)) return;

      setAnswers((prev) => ({
        ...prev,
        [id]: digit,
      }));

      const sequence = layout.solvingSequence;
      const currIdx = sequence.indexOf(id);
      if (currIdx !== -1 && currIdx < sequence.length - 1) {
        scheduleFocus(sequence[currIdx + 1]);
      }
    },
    [layout, scheduleFocus]
  );

  const handleKeyDown = useCallback(
    (id: string, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!layout) return;

      const sequence = layout.solvingSequence;
      const currIdx = sequence.indexOf(id);

      if (e.key === 'Backspace') {
        e.preventDefault();

        const currentVal = answers[id] || '';
        if (currentVal !== '') {
          setAnswers((prev) => ({
            ...prev,
            [id]: '',
          }));
          return;
        }

        if (currIdx > 0) {
          const prevId = sequence[currIdx - 1];
          setAnswers((prev) => ({
            ...prev,
            [prevId]: '',
          }));
          scheduleFocus(prevId);
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();

        if (currIdx !== -1 && currIdx < sequence.length - 1) {
          scheduleFocus(sequence[currIdx + 1]);
        } else if (currIdx === sequence.length - 1) {
          const didSubmit = submitHandlerRef.current?.();
          if (didSubmit !== false) {
            e.stopPropagation();
          }
        }
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();

        if (currIdx !== -1 && currIdx < sequence.length - 1) {
          scheduleFocus(sequence[currIdx + 1]);
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currIdx > 0) {
          focusCell(sequence[currIdx - 1]);
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currIdx !== -1 && currIdx < sequence.length - 1) {
          focusCell(sequence[currIdx + 1]);
        }
        return;
      }
    },
    [layout, answers, scheduleFocus, focusCell]
  );

  return {
    answers,
    setAnswers,
    showDivisionValidation,
    setShowDivisionValidation,
    hasFailedThisDivision,
    setHasFailedThisDivision,
    handleCellChange,
    handleKeyDown,
    isDivisionFilled,
    resetDivisionState,
    registerCellRef,
    focusCell,
    focusFirstCell,
    registerSubmitHandler,
  };
};
