import { useCallback, useEffect, useMemo, useState } from 'react';
import { getInstallableApps, installApp } from '../services/appInstallService';
import type { AppInstallId, AppInstallItem, AppInstallResult } from '../types/apps';

interface InstallableAppsCache {
  apps: AppInstallItem[];
  wingetAvailable: boolean;
}

let installableAppsCache: InstallableAppsCache | null = null;

export function useInstallableApps() {
  const [apps, setApps] = useState<AppInstallItem[]>(() => installableAppsCache?.apps ?? []);
  const [wingetAvailable, setWingetAvailable] = useState(() => installableAppsCache?.wingetAvailable ?? false);
  const [isLoading, setIsLoading] = useState(() => !installableAppsCache);
  const [runningId, setRunningId] = useState<AppInstallId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Partial<Record<AppInstallId, AppInstallResult>>>({});

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getInstallableApps();
      installableAppsCache = { apps: response.apps, wingetAvailable: response.wingetAvailable };
      setApps(response.apps);
      setWingetAvailable(response.wingetAvailable);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Nao foi possivel carregar a lista de apps.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!installableAppsCache) {
      void refresh();
    }
  }, [refresh]);

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
      setRunningId(id);
      setError(null);

      try {
        const result = await installApp(id);
        setMessages((current) => ({ ...current, [id]: result }));
        if (result.success) {
          setApps((current) => {
            const nextApps = current.map((app) =>
              app.id === id
                ? {
                    ...app,
                    status: result.status,
                    version: result.status === 'installed' ? app.version : null
                  }
                : app
            );
            installableAppsCache = {
              apps: nextApps,
              wingetAvailable: installableAppsCache?.wingetAvailable ?? wingetAvailable
            };
            return nextApps;
          });
        }
      } catch (unknownError) {
        setError(unknownError instanceof Error ? unknownError.message : 'Nao foi possivel iniciar a instalacao.');
      } finally {
        setRunningId(null);
      }
    },
    [wingetAvailable]
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
