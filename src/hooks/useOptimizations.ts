import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { optimizationCategories } from '../data/optimizations';
import {
  applyOptimization,
  createRestorePoint,
  getOptimizationStatus,
  getOptimizations,
  isRunningAsAdmin,
  revertOptimization
} from '../services/optimizationService';
import {
  finishOperation,
  isOperationRunning,
  startOperation,
  type OperationOutcome
} from '../services/operationState';
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

interface OptimizationsRequest {
  id: number;
  promise: Promise<OptimizationsCache>;
}

interface StatusRequest {
  id: number;
  promise: Promise<OptimizationStatus>;
}

let optimizationsCache: OptimizationsCache | null = null;
let nextOptimizationsRequestId = 0;
let latestOptimizationsRequestId = 0;
let optimizationsInFlight: OptimizationsRequest | null = null;
let nextStatusRequestId = 0;
const latestStatusRequestIds = new Map<OptimizationId, number>();
const statusInFlight = new Map<OptimizationId, StatusRequest>();

function getOptimizationsRequest(force: boolean): OptimizationsRequest {
  if (optimizationsInFlight && !force) return optimizationsInFlight;

  const request: OptimizationsRequest = {
    id: ++nextOptimizationsRequestId,
    promise: Promise.all([getOptimizations(), isRunningAsAdmin()]).then(([list, isAdmin]) => ({
      optimizations: list.optimizations,
      isAdmin
    }))
  };
  latestOptimizationsRequestId = request.id;
  optimizationsInFlight = request;
  void request.promise.then(
    () => {
      if (optimizationsInFlight === request) optimizationsInFlight = null;
    },
    () => {
      if (optimizationsInFlight === request) optimizationsInFlight = null;
    }
  );
  return request;
}

function getStatusRequest(id: OptimizationId): StatusRequest {
  const existing = statusInFlight.get(id);
  if (existing) return existing;

  const request: StatusRequest = {
    id: ++nextStatusRequestId,
    promise: getOptimizationStatus(id).then((response) => response.status)
  };
  latestStatusRequestIds.set(id, request.id);
  statusInFlight.set(id, request);
  void request.promise.then(
    () => {
      if (statusInFlight.get(id) === request) statusInFlight.delete(id);
    },
    () => {
      if (statusInFlight.get(id) === request) statusInFlight.delete(id);
    }
  );
  return request;
}

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
  const runningIdRef = useRef<OptimizationId | null>(null);
  const [messages, setMessages] = useState<Partial<Record<OptimizationId, OptimizationMessage>>>({});
  const mountedRef = useRef(false);
  const viewGenerationRef = useRef(0);
  const statusGenerationRef = useRef(0);
  const actionGenerationRef = useRef(0);

  const loadOptimizations = useCallback(async (force: boolean) => {
    if (!mountedRef.current || runningIdRef.current !== null || isOperationRunning()) return;

    const request = getOptimizationsRequest(force);
    const generation = ++viewGenerationRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await request.promise;
      if (
        !mountedRef.current ||
        generation !== viewGenerationRef.current ||
        request.id !== latestOptimizationsRequestId
      ) {
        return;
      }

      optimizationsCache = response;
      setOptimizations(response.optimizations);
      setIsAdmin(response.isAdmin);
    } catch (unknownError) {
      if (
        !mountedRef.current ||
        generation !== viewGenerationRef.current ||
        request.id !== latestOptimizationsRequestId
      ) {
        return;
      }

      setError(
        unknownError instanceof Error
          ? unknownError.message
          : 'Não foi possível carregar as otimizações disponíveis.'
      );
    } finally {
      if (mountedRef.current && generation === viewGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => loadOptimizations(true), [loadOptimizations]);

  useEffect(() => {
    mountedRef.current = true;
    if (!optimizationsCache) void loadOptimizations(false);

    return () => {
      mountedRef.current = false;
      viewGenerationRef.current += 1;
      actionGenerationRef.current += 1;
    };
  }, [loadOptimizations]);

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

  const refreshOptimizationStatus = useCallback(async (id: OptimizationId): Promise<boolean> => {
    const request = getStatusRequest(id);
    const generation = ++statusGenerationRef.current;

    try {
      const status = await request.promise;
      if (
        !mountedRef.current ||
        generation !== statusGenerationRef.current ||
        latestStatusRequestIds.get(id) !== request.id
      ) {
        return false;
      }

      setOptimizations((current) => {
        const nextOptimizations = current.map((optimization) =>
          optimization.id === id ? { ...optimization, status } : optimization
        );
        optimizationsCache = {
          optimizations: nextOptimizations,
          isAdmin: optimizationsCache?.isAdmin ?? false
        };
        return nextOptimizations;
      });
      return true;
    } catch (unknownError) {
      if (
        !mountedRef.current ||
        generation !== statusGenerationRef.current ||
        latestStatusRequestIds.get(id) !== request.id
      ) {
        return false;
      }

      const detail = unknownError instanceof Error ? unknownError.message : 'tente atualizar a lista novamente';
      setMessages((current) => ({
        ...current,
        [id]: {
          id,
          tone: 'error',
          text: `Ajuste concluído, mas não foi possível confirmar o status. ${detail}`
        }
      }));
      return false;
    }
  }, []);

  const runAction = useCallback(
    async (id: OptimizationId, action: PendingAction, options: { createRestorePointFirst?: boolean } = {}) => {
      if (runningIdRef.current !== null || isOperationRunning()) {
        if (mountedRef.current) {
          setMessages((current) => ({
            ...current,
            [id]: { id, tone: 'error', text: 'Outra operação está em andamento. Aguarde a conclusão.' }
          }));
        }
        return;
      }

      const operation = startOperation(
        'optimization',
        action === 'apply' ? 'Aplicação de otimização' : 'Reversão de otimização',
        action === 'apply' ? 'Aplicando o ajuste selecionado.' : 'Revertendo o ajuste selecionado.'
      );
      if (!operation) return;

      const actionGeneration = ++actionGenerationRef.current;
      viewGenerationRef.current += 1;
      setIsLoading(false);
      runningIdRef.current = id;
      setRunningId(id);
      setMessages((current) => ({
        ...current,
        [id]: { id, tone: 'info', text: action === 'apply' ? 'Aplicando ajuste...' : 'Revertendo ajuste...' }
      }));

      let outcome: OperationOutcome = 'error';
      let completionMessage = 'Falha ao executar a otimização.';
      const isCurrentAction = () =>
        mountedRef.current && actionGeneration === actionGenerationRef.current;

      try {
        if (options.createRestorePointFirst) {
          const restorePoint = await createRestorePoint();
          if (!restorePoint.success) {
            completionMessage = restorePoint.message;
            if (isCurrentAction()) {
              setMessages((current) => ({
                ...current,
                [id]: { id, tone: 'error', text: restorePoint.message }
              }));
            }
            return;
          }
        }

        const response: OptimizationActionResult =
          action === 'apply' ? await applyOptimization(id) : await revertOptimization(id);
        completionMessage = response.message;

        if (isCurrentAction()) {
          setMessages((current) => ({
            ...current,
            [id]: { id, tone: response.success ? 'success' : 'error', text: response.message }
          }));
        }

        if (!response.success) return;

        outcome = 'success';
        const optimisticStatus: OptimizationStatus = action === 'apply' ? 'active' : 'inactive';
        if (isCurrentAction()) {
          setPendingAction(id, null);
          setOptimizations((current) => {
            const nextOptimizations = current.map((optimization) =>
              optimization.id === id ? { ...optimization, status: optimisticStatus } : optimization
            );
            optimizationsCache = {
              optimizations: nextOptimizations,
              isAdmin: optimizationsCache?.isAdmin ?? false
            };
            return nextOptimizations;
          });
          await refreshOptimizationStatus(id);
        }
      } catch (unknownError) {
        completionMessage =
          unknownError instanceof Error ? unknownError.message : 'Falha ao executar a otimização.';
        if (isCurrentAction()) {
          setMessages((current) => ({
            ...current,
            [id]: { id, tone: 'error', text: completionMessage }
          }));
        }
      } finally {
        finishOperation(operation, outcome, completionMessage);
        runningIdRef.current = null;
        if (mountedRef.current && actionGeneration === actionGenerationRef.current) {
          setRunningId(null);
        }
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
