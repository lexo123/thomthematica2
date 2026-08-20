import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTimerOptions {
  timeLimit: number;
  onTimeOut: () => void;
}

export const useTimer = ({ timeLimit, onTimeOut }: UseTimerOptions) => {
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          onTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timeLimit, stopTimer, onTimeOut]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  return {
    timeLeft,
    setTimeLeft,
    startTimer,
    stopTimer
  };
};
