import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCleanupTasks, runCleanup } from '../services/cleanupService';
import type { CleanupId, CleanupRunResult, CleanupTask } from '../types/cleanup';

interface CleanupCache {
  tasks: CleanupTask[];
  lastCleanupAt: string | null;
}

let cleanupCache: CleanupCache | null = null;

export function useCleanup() {
  const [tasks, setTasks] = useState<CleanupTask[]>(() => cleanupCache?.tasks ?? []);
  const [selectedIds, setSelectedIds] = useState<CleanupId[]>([]);
  const [lastCleanupAt, setLastCleanupAt] = useState<string | null>(() => cleanupCache?.lastCleanupAt ?? null);
  const [isLoading, setIsLoading] = useState(() => !cleanupCache);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CleanupRunResult | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getCleanupTasks();
      cleanupCache = { tasks: response.tasks, lastCleanupAt: response.lastCleanupAt };
      setTasks(response.tasks);
      setLastCleanupAt(response.lastCleanupAt);
    } catch (unknownError) {
      setError(
        unknownError instanceof Error ? unknownError.message : 'Não foi possível carregar as opções de limpeza.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cleanupCache) {
      void refresh();
    }
  }, [refresh]);

  const selectedTasks = useMemo(
    () => tasks.filter((task) => selectedIds.includes(task.id)),
    [selectedIds, tasks]
  );

  const selectedBytes = useMemo(() => {
    const values = selectedTasks.map((task) => task.estimatedBytes).filter((value): value is number => value !== null);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  }, [selectedTasks]);

  const toggleTask = useCallback((id: CleanupId) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setResult(null);
  }, []);

  const executeCleanup = useCallback(async () => {
    if (selectedIds.length === 0) return;

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await runCleanup(selectedIds);
      setResult(response);
      setLastCleanupAt(response.lastCleanupAt);
      if (response.success) {
        const cleanedIds = new Set(response.results.filter((item) => item.success).map((item) => item.id));
        setTasks((current) => {
          const nextTasks = current.map((task) => (cleanedIds.has(task.id) ? { ...task, estimatedBytes: 0 } : task));
          cleanupCache = { tasks: nextTasks, lastCleanupAt: response.lastCleanupAt };
          return nextTasks;
        });
        setSelectedIds([]);
      }
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Não foi possível executar a limpeza.');
    } finally {
      setIsRunning(false);
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
