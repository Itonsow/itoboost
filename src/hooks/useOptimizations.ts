import { useCallback, useEffect, useMemo, useState } from 'react';
import { optimizationCategories } from '../data/optimizations';
import {
  applyOptimization,
  createRestorePoint,
  getOptimizationStatus,
  getOptimizations,
  isRunningAsAdmin,
  revertOptimization
} from '../services/optimizationService';
import type {
  OptimizationActionResult,
  OptimizationCategory,
  OptimizationId,
  OptimizationStatus,
  OptimizationViewModel
} from '../types/optimization';

type PendingAction = 'apply' | 'revert';

interface OptimizationMessage {
  id: OptimizationId;
  tone: 'success' | 'error' | 'info';
  text: string;
}

interface OptimizationsCache {
  optimizations: OptimizationViewModel[];
  isAdmin: boolean;
}

let optimizationsCache: OptimizationsCache | null = null;

export function useOptimizations() {
  const [optimizations, setOptimizations] = useState<OptimizationViewModel[]>(
    () => optimizationsCache?.optimizations ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !optimizationsCache);
  const [isAdmin, setIsAdmin] = useState(() => optimizationsCache?.isAdmin ?? false);
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
      optimizationsCache = { optimizations: list.optimizations, isAdmin: adminStatus };
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
    if (!optimizationsCache) {
      void refresh();
    }
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

  const refreshOptimizationStatus = useCallback(async (id: OptimizationId) => {
    const status = await getOptimizationStatus(id);
    setOptimizations((current) => {
      const nextOptimizations = current.map((optimization) => {
        const next = optimization.id === id ? { ...optimization, status: status.status } : optimization;
        return next;
      });
      optimizationsCache = { optimizations: nextOptimizations, isAdmin: optimizationsCache?.isAdmin ?? false };
      return nextOptimizations;
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
          const optimisticStatus: OptimizationStatus = action === 'apply' ? 'active' : 'inactive';
          setOptimizations((current) => {
            const nextOptimizations = current.map((optimization) => {
              const next =
                optimization.id === id
                  ? { ...optimization, status: optimisticStatus }
                  : optimization;
              return next;
            });
            optimizationsCache = { optimizations: nextOptimizations, isAdmin: optimizationsCache?.isAdmin ?? false };
            return nextOptimizations;
          });
          void refreshOptimizationStatus(id);
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
    [refreshOptimizationStatus, setPendingAction]
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
