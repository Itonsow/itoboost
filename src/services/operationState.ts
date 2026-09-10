export type OperationKind = 'optimization' | 'cleanup' | 'installation';
export type OperationStatus = 'idle' | 'running' | 'success' | 'error';
export type OperationOutcome = 'success' | 'error';

export interface OperationState {
  token: number | null;
  kind: OperationKind | null;
  status: OperationStatus;
  title: string;
  description: string;
}

export interface OperationHandle {
  token: number;
  kind: OperationKind;
}

const idleOperation: OperationState = {
  token: null,
  kind: null,
  status: 'idle',
  title: '',
  description: ''
};

let nextToken = 0;
let activeOperation: OperationHandle | null = null;
let currentState: OperationState = idleOperation;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function getOperationState(): OperationState {
  return currentState;
}

export function subscribeOperationState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isOperationRunning(): boolean {
  return activeOperation !== null;
}

export function startOperation(
  kind: OperationKind,
  title: string,
  description: string
): OperationHandle | null {
  if (activeOperation !== null) return null;

  const handle: OperationHandle = { token: ++nextToken, kind };
  activeOperation = handle;
  currentState = {
    token: handle.token,
    kind,
    status: 'running',
    title,
    description
  };
  notify();
  return handle;
}

export function finishOperation(
  handle: OperationHandle,
  outcome: OperationOutcome,
  description: string
): void {
  if (activeOperation?.token !== handle.token) return;

  activeOperation = null;
  currentState = {
    ...currentState,
    status: outcome,
    description:
      description || (outcome === 'success' ? 'Operação concluída com sucesso.' : 'A operação falhou.')
  };
  notify();
}
