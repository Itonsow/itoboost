import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCleanupTasks, runCleanup } from '../services/cleanupService';
import {
  finishOperation,
  isOperationRunning,
  startOperation,
  type OperationOutcome
} from '../services/operationState';
import type { CleanupId, CleanupRunResult, CleanupTask } from '../types/cleanup';

interface CleanupCache {
  tasks: CleanupTask[];
  lastCleanupAt: string | null;
}

interface CleanupRequest {
  id: number;
  promise: Promise<CleanupCache>;
}

let cleanupCache: CleanupCache | null = null;
let nextCleanupRequestId = 0;
let latestCleanupRequestId = 0;
let cleanupInFlight: CleanupRequest | null = null;

function getCleanupRequest(force: boolean): CleanupRequest {
  if (cleanupInFlight && !force) return cleanupInFlight;

  const request: CleanupRequest = {
    id: ++nextCleanupRequestId,
    promise: getCleanupTasks()
  };
  latestCleanupRequestId = request.id;
  cleanupInFlight = request;
  void request.promise.then(
    () => {
      if (cleanupInFlight === request) cleanupInFlight = null;
    },
    () => {
      if (cleanupInFlight === request) cleanupInFlight = null;
    }
  );
  return request;
}

export function useCleanup() {
  const [tasks, setTasks] = useState<CleanupTask[]>(() => cleanupCache?.tasks ?? []);
  const [selectedIds, setSelectedIds] = useState<CleanupId[]>([]);
  const [lastCleanupAt, setLastCleanupAt] = useState<string | null>(() => cleanupCache?.lastCleanupAt ?? null);
  const [isLoading, setIsLoading] = useState(() => !cleanupCache);
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CleanupRunResult | null>(null);
  const mountedRef = useRef(false);
  const viewGenerationRef = useRef(0);
  const actionGenerationRef = useRef(0);

  const loadCleanupTasks = useCallback(async (force: boolean) => {
    if (!mountedRef.current || isRunningRef.current || isOperationRunning()) return;

    const request = getCleanupRequest(force);
    const generation = ++viewGenerationRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await request.promise;
      if (
        !mountedRef.current ||
        generation !== viewGenerationRef.current ||
        request.id !== latestCleanupRequestId
      ) {
        return;
      }

      cleanupCache = response;
      setTasks(response.tasks);
      setLastCleanupAt(response.lastCleanupAt);
    } catch (unknownError) {
      if (
        !mountedRef.current ||
        generation !== viewGenerationRef.current ||
        request.id !== latestCleanupRequestId
      ) {
        return;
      }

      setError(
        unknownError instanceof Error
          ? unknownError.message
          : 'Não foi possível carregar as opções de limpeza.'
      );
    } finally {
      if (mountedRef.current && generation === viewGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => loadCleanupTasks(true), [loadCleanupTasks]);

  useEffect(() => {
    mountedRef.current = true;
    if (!cleanupCache) void loadCleanupTasks(false);

    return () => {
      mountedRef.current = false;
      viewGenerationRef.current += 1;
      actionGenerationRef.current += 1;
    };
  }, [loadCleanupTasks]);

  const selectedTasks = useMemo(
    () => tasks.filter((task) => selectedIds.includes(task.id)),
    [selectedIds, tasks]
  );

  const selectedBytes = useMemo(() => {
    const values = selectedTasks.map((task) => task.estimatedBytes).filter((value): value is number => value !== null);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  }, [selectedTasks]);

  const toggleTask = useCallback((id: CleanupId) => {
    if (isRunningRef.current || isOperationRunning()) return;
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setResult(null);
  }, []);

  const executeCleanup = useCallback(async () => {
    if (selectedIds.length === 0 || isRunningRef.current || isOperationRunning()) return;

    const ids = [...selectedIds];
    const operation = startOperation(
      'cleanup',
      'Limpeza do sistema',
      `${ids.length} limpeza(s) selecionada(s).`
    );
    if (!operation) return;

    const actionGeneration = ++actionGenerationRef.current;
    viewGenerationRef.current += 1;
    isRunningRef.current = true;
    setIsRunning(true);
    setError(null);
    setResult(null);

    let outcome: OperationOutcome = 'error';
    let completionMessage = 'Não foi possível executar a limpeza.';
    const isCurrentAction = () =>
      mountedRef.current && actionGeneration === actionGenerationRef.current;

    try {
      const response = await runCleanup(ids);
      completionMessage = response.message;
      const cleanedIds = new Set(response.results.filter((item) => item.success).map((item) => item.id));
      const hasFailedItems = response.results.some((item) => !item.success);
      outcome = response.success && !hasFailedItems ? 'success' : 'error';

      if (isCurrentAction()) {
        setResult(response);
        setLastCleanupAt(response.lastCleanupAt);
        setTasks((current) => {
          const nextTasks = current.map((task) =>
            cleanedIds.has(task.id) ? { ...task, estimatedBytes: 0 } : task
          );
          cleanupCache = { tasks: nextTasks, lastCleanupAt: response.lastCleanupAt };
          return nextTasks;
        });
        if (cleanedIds.size > 0) {
          setSelectedIds((current) => current.filter((id) => !cleanedIds.has(id)));
        }
      }
    } catch (unknownError) {
      completionMessage = unknownError instanceof Error ? unknownError.message : 'Não foi possível executar a limpeza.';
      if (isCurrentAction()) setError(completionMessage);
    } finally {
      finishOperation(operation, outcome, completionMessage);
      isRunningRef.current = false;
      if (mountedRef.current && actionGeneration === actionGenerationRef.current) {
        setIsRunning(false);
      }
    }
  }, [selectedIds]);

  return {
    tasks,
    selectedIds,
    selectedTasks,
    selectedBytes,
    lastCleanupAt,
    isLoading,
    isRunning,
    error,
    result,
    refresh,
    toggleTask,
    executeCleanup
  };
}
