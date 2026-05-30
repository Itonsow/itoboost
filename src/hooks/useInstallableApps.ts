import { useCallback, useEffect, useMemo, useState } from 'react';
import { getInstallableApps, installApp } from '../services/appInstallService';
import type { AppInstallId, AppInstallItem, AppInstallResult } from '../types/apps';

export function useInstallableApps() {
  const [apps, setApps] = useState<AppInstallItem[]>([]);
  const [wingetAvailable, setWingetAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [runningId, setRunningId] = useState<AppInstallId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Partial<Record<AppInstallId, AppInstallResult>>>({});

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getInstallableApps();
      setApps(response.apps);
      setWingetAvailable(response.wingetAvailable);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Nao foi possivel carregar a lista de apps.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
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
        await refresh();
      } catch (unknownError) {
        setError(unknownError instanceof Error ? unknownError.message : 'Nao foi possivel iniciar a instalacao.');
      } finally {
        setRunningId(null);
      }
    },
    [refresh]
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
