import { useEffect, useRef, useState } from 'react';

interface ActionProgressState {
  isVisible: boolean;
  isComplete: boolean;
  progress: number;
}

export function useActionProgress(isRunning: boolean): ActionProgressState {
  const [isVisible, setIsVisible] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const wasRunningRef = useRef(false);

  useEffect(() => {
    let intervalId: number | undefined;
    let timeoutId: number | undefined;

    if (isRunning) {
      wasRunningRef.current = true;
      setIsVisible(true);
      setIsComplete(false);
      setProgress(0);

      intervalId = window.setInterval(() => {
        setProgress((current) => {
          if (current >= 94) return current;
          const step = current < 35 ? 7 : current < 70 ? 4 : 2;
          return Math.min(current + step, 94);
        });
      }, 420);
    } else if (wasRunningRef.current) {
      wasRunningRef.current = false;
      setIsVisible(true);
      setIsComplete(true);
      setProgress(100);

      timeoutId = window.setTimeout(() => {
        setIsVisible(false);
        setIsComplete(false);
        setProgress(0);
      }, 900);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isRunning]);

  return { isVisible, isComplete, progress };
}
