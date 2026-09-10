import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getInstallableApps, installApp } from '../services/appInstallService';
import {
  finishOperation,
  isOperationRunning,
  startOperation,
  type OperationOutcome
} from '../services/operationState';
import type { AppInstallId, AppInstallItem, AppInstallResult } from '../types/apps';

interface InstallableAppsCache {
  apps: AppInstallItem[];
  wingetAvailable: boolean;
}

interface InstallableAppsRequest {
  id: number;
  promise: Promise<InstallableAppsCache>;
}

let installableAppsCache: InstallableAppsCache | null = null;
let nextInstallableAppsRequestId = 0;
let latestInstallableAppsRequestId = 0;
let installableAppsInFlight: InstallableAppsRequest | null = null;

function getInstallableAppsRequest(force: boolean): InstallableAppsRequest {
  if (installableAppsInFlight && !force) return installableAppsInFlight;

  const request: InstallableAppsRequest = {
    id: ++nextInstallableAppsRequestId,
    promise: getInstallableApps()
  };
  latestInstallableAppsRequestId = request.id;
  installableAppsInFlight = request;
  void request.promise.then(
    () => {
      if (installableAppsInFlight === request) installableAppsInFlight = null;
    },
    () => {
      if (installableAppsInFlight === request) installableAppsInFlight = null;
    }
  );
  return request;
}

export function useInstallableApps() {
  const [apps, setApps] = useState<AppInstallItem[]>(() => installableAppsCache?.apps ?? []);
  const [wingetAvailable, setWingetAvailable] = useState(() => installableAppsCache?.wingetAvailable ?? false);
  const [isLoading, setIsLoading] = useState(() => !installableAppsCache);
  const [runningId, setRunningId] = useState<AppInstallId | null>(null);
  const runningIdRef = useRef<AppInstallId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Partial<Record<AppInstallId, AppInstallResult>>>({});
  const mountedRef = useRef(false);
  const viewGenerationRef = useRef(0);
  const actionGenerationRef = useRef(0);

  const loadInstallableApps = useCallback(async (force: boolean) => {
    if (!mountedRef.current || runningIdRef.current !== null || isOperationRunning()) return;

    const request = getInstallableAppsRequest(force);
    const generation = ++viewGenerationRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await request.promise;
      if (
        !mountedRef.current ||
        generation !== viewGenerationRef.current ||
        request.id !== latestInstallableAppsRequestId
      ) {
        return;
      }

      installableAppsCache = response;
      setApps(response.apps);
      setWingetAvailable(response.wingetAvailable);
    } catch (unknownError) {
      if (
        !mountedRef.current ||
        generation !== viewGenerationRef.current ||
        request.id !== latestInstallableAppsRequestId
      ) {
        return;
      }

      setError(unknownError instanceof Error ? unknownError.message : 'Nao foi possivel carregar a lista de apps.');
    } finally {
      if (mountedRef.current && generation === viewGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => loadInstallableApps(true), [loadInstallableApps]);

  useEffect(() => {
    mountedRef.current = true;
    if (!installableAppsCache) void loadInstallableApps(false);

    return () => {
      mountedRef.current = false;
      viewGenerationRef.current += 1;
      actionGenerationRef.current += 1;
    };
  }, [loadInstallableApps]);

  const counts = useMemo(
    () => ({
      total: apps.length,
      installed: apps.filter((app) => app.status === 'installed').length,
      external: apps.filter((app) => app.installKind === 'external').length
    }),
    [apps]
  );

  const runInstall = useCallback(
    async (id: AppInstallId) => {
      if (runningIdRef.current !== null || isOperationRunning()) {
        if (mountedRef.current) {
          setError('Outra operação está em andamento. Aguarde a conclusão.');
        }
        return;
      }

      const app = apps.find((item) => item.id === id);
      const operation = startOperation(
        'installation',
        'Instalação de app',
        app ? `Preparando ${app.name}.` : 'Preparando a instalação selecionada.'
      );
      if (!operation) return;

      const actionGeneration = ++actionGenerationRef.current;
      viewGenerationRef.current += 1;
      runningIdRef.current = id;
      setRunningId(id);
      setError(null);

      let outcome: OperationOutcome = 'error';
      let completionMessage = 'Nao foi possivel iniciar a instalacao.';
      const isCurrentAction = () =>
        mountedRef.current && actionGeneration === actionGenerationRef.current;

      try {
        const result = await installApp(id);
        completionMessage = result.message;
        if (isCurrentAction()) setMessages((current) => ({ ...current, [id]: result }));

        if (!result.success) return;

        outcome = 'success';
        if (isCurrentAction()) {
          setApps((current) => {
            const nextApps = current.map((appItem) =>
              appItem.id === id
                ? {
                    ...appItem,
                    status: result.status,
                    version: result.status === 'installed' ? appItem.version : null
                  }
                : appItem
            );
            installableAppsCache = {
              apps: nextApps,
              wingetAvailable: installableAppsCache?.wingetAvailable ?? wingetAvailable
            };
            return nextApps;
          });
        }
      } catch (unknownError) {
        completionMessage =
          unknownError instanceof Error ? unknownError.message : 'Nao foi possivel iniciar a instalacao.';
        if (isCurrentAction()) setError(completionMessage);
      } finally {
        finishOperation(operation, outcome, completionMessage);
        runningIdRef.current = null;
        if (mountedRef.current && actionGeneration === actionGenerationRef.current) {
          setRunningId(null);
        }
      }
    },
    [apps, wingetAvailable]
  );

  return {
    apps,
    wingetAvailable,
    isLoading,
    runningId,
    error,
    messages,
    counts,
    refresh,
    runInstall
  };
}
