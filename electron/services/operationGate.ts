import { hasUnresolvedProcessTermination } from './powershellService';

export type MutableOperation = 'optimization' | 'cleanup' | 'installation' | 'restore-point' | 'process-recovery';

export interface OperationLease {
  readonly operation: MutableOperation;
  release(): void;
}

let activeOperation: MutableOperation | null = null;

export function getActiveOperation(): MutableOperation | null {
  return activeOperation;
}

export function isMutableOperationActive(): boolean {
  return activeOperation !== null;
}

export function tryAcquireOperation(operation: MutableOperation): OperationLease | null {
  if (activeOperation !== null || hasUnresolvedProcessTermination()) {
    return null;
  }

  activeOperation = operation;
  let released = false;

  return {
    operation,
    release: () => {
      if (released) return;
      released = true;
      if (activeOperation === operation) {
        activeOperation = null;
      }
    }
  };
}

export async function withOperationGate<T>(
  operation: MutableOperation,
  task: () => Promise<T>,
  onBusy: (activeOperation: MutableOperation) => T
): Promise<T> {
  const lease = tryAcquireOperation(operation);
  if (!lease) {
    return onBusy(activeOperation ?? 'process-recovery');
  }

  try {
    return await task();
  } finally {
    lease.release();
  }
}
