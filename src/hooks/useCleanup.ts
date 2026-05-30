import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCleanupTasks, runCleanup } from '../services/cleanupService';
import type { CleanupId, CleanupRunResult, CleanupTask } from '../types/cleanup';

export function useCleanup() {
  const [tasks, setTasks] = useState<CleanupTask[]>([]);
  const [selectedIds, setSelectedIds] = useState<CleanupId[]>([]);
  const [lastCleanupAt, setLastCleanupAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CleanupRunResult | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getCleanupTasks();
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
    void refresh();
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
        setSelectedIds([]);
        await refresh();
      }
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Não foi possível executar a limpeza.');
    } finally {
      setIsRunning(false);
    }
  }, [refresh, selectedIds]);

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
