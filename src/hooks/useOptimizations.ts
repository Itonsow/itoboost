import { useCallback, useEffect, useMemo, useState } from 'react';
import { optimizationCategories } from '../data/optimizations';
import {
  applyOptimization,
  createRestorePoint,
  getOptimizations,
  isRunningAsAdmin,
  revertOptimization
} from '../services/optimizationService';
import type {
  OptimizationActionResult,
  OptimizationCategory,
  OptimizationId,
  OptimizationViewModel
} from '../types/optimization';

type PendingAction = 'apply' | 'revert';

interface OptimizationMessage {
  id: OptimizationId;
  tone: 'success' | 'error' | 'info';
  text: string;
}

export function useOptimizations() {
  const [optimizations, setOptimizations] = useState<OptimizationViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<OptimizationCategory>('Todos');
  const [pendingActions, setPendingActions] = useState<Partial<Record<OptimizationId, PendingAction>>>({});
  const [runningId, setRunningId] = useState<OptimizationId | null>(null);
  const [messages, setMessages] = useState<Partial<Record<OptimizationId, OptimizationMessage>>>({});

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [list, adminStatus] = await Promise.all([getOptimizations(), isRunningAsAdmin()]);
      setOptimizations(list.optimizations);
      setIsAdmin(adminStatus);
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : 'Não foi possível carregar as otimizações disponíveis.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredOptimizations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return optimizations
      .filter((optimization) => {
        const matchesCategory = category === 'Todos' || optimization.categories.includes(category);
        const matchesQuery =
          !normalizedQuery ||
          optimization.title.toLowerCase().includes(normalizedQuery) ||
          optimization.description.toLowerCase().includes(normalizedQuery) ||
          optimization.categories.some((item) => item.toLowerCase().includes(normalizedQuery));

        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  }, [category, optimizations, query]);

  const counts = useMemo(
    () => ({
      available: optimizations.length,
      active: optimizations.filter((optimization) => optimization.status === 'active').length,
      visible: filteredOptimizations.length
    }),
    [filteredOptimizations.length, optimizations]
  );

  const setPendingAction = useCallback((id: OptimizationId, action: PendingAction | null) => {
    setPendingActions((current) => {
      const next = { ...current };
      if (action) {
        next[id] = action;
      } else {
        delete next[id];
      }

      return next;
    });
  }, []);

  const runAction = useCallback(
    async (id: OptimizationId, action: PendingAction, options: { createRestorePointFirst?: boolean } = {}) => {
      setRunningId(id);
      setMessages((current) => ({
        ...current,
        [id]: { id, tone: 'info', text: action === 'apply' ? 'Aplicando ajuste...' : 'Revertendo ajuste...' }
      }));

      try {
        if (options.createRestorePointFirst) {
          const restorePoint = await createRestorePoint();
          if (!restorePoint.success) {
            setMessages((current) => ({
              ...current,
              [id]: { id, tone: 'error', text: restorePoint.message }
            }));
            return;
          }
        }

        const response: OptimizationActionResult =
          action === 'apply' ? await applyOptimization(id) : await revertOptimization(id);

        setMessages((current) => ({
          ...current,
          [id]: { id, tone: response.success ? 'success' : 'error', text: response.message }
        }));

        if (response.success) {
          setPendingAction(id, null);
          await refresh();
        }
      } catch (unknownError) {
        setMessages((current) => ({
          ...current,
          [id]: {
            id,
            tone: 'error',
            text: unknownError instanceof Error ? unknownError.message : 'Falha ao executar a otimização.'
          }
        }));
      } finally {
        setRunningId(null);
      }
    },
    [refresh, setPendingAction]
  );

  return {
    categories: optimizationCategories,
    optimizations: filteredOptimizations,
    allOptimizations: optimizations,
    counts,
    isLoading,
    isAdmin,
    error,
    query,
    setQuery,
    category,
    setCategory,
    pendingActions,
    setPendingAction,
    runningId,
    messages,
    runAction,
    refresh
  };
}
