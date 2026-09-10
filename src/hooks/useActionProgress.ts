import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  getOperationState,
  subscribeOperationState,
  type OperationStatus
} from '../services/operationState';

type VisibleOperationStatus = Exclude<OperationStatus, 'idle'>;

interface ActionProgressState {
  isVisible: boolean;
  isComplete: boolean;
  isFailed: boolean;
  progress: number;
  status: VisibleOperationStatus;
  title: string;
  description: string;
}

export function useActionProgress(): ActionProgressState {
  const operation = useSyncExternalStore(subscribeOperationState, getOperationState, getOperationState);
  const [isVisible, setIsVisible] = useState(operation.status !== 'idle');
  const [progress, setProgress] = useState(operation.status === 'running' ? 0 : 100);
  const lastTokenRef = useRef<number | null>(operation.token);

  useEffect(() => {
    let intervalId: number | undefined;
    let timeoutId: number | undefined;

    if (operation.status === 'running') {
      const isNewOperation = operation.token !== lastTokenRef.current;
      lastTokenRef.current = operation.token;
      setIsVisible(true);
      if (isNewOperation) setProgress(0);

      intervalId = window.setInterval(() => {
        setProgress((current) => {
          if (current >= 94) return current;
          const step = current < 35 ? 7 : current < 70 ? 4 : 2;
          return Math.min(current + step, 94);
        });
      }, 420);
    } else if (operation.status === 'success' || operation.status === 'error') {
      lastTokenRef.current = operation.token;
      setIsVisible(true);
      setProgress(100);

      timeoutId = window.setTimeout(() => {
        setIsVisible(false);
      }, 1200);
    } else {
      lastTokenRef.current = null;
      setIsVisible(false);
      setProgress(0);
    }

    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [operation]);

  const status: VisibleOperationStatus = operation.status === 'idle' ? 'running' : operation.status;

  return {
    isVisible,
    isComplete: isVisible && status !== 'running',
    isFailed: isVisible && status === 'error',
    progress,
    status,
    title: operation.title,
    description: operation.description
  };
}
