import { useCallback, useEffect, useState } from 'react';
import { getSystemInfo } from '../services/systemService';
import type { SystemInfo } from '../types/system';

interface UseSystemInfoResult {
  data: SystemInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

let systemInfoCache: SystemInfo | null = null;

export function useSystemInfo(): UseSystemInfoResult {
  const [data, setData] = useState<SystemInfo | null>(() => systemInfoCache);
  const [isLoading, setIsLoading] = useState(() => !systemInfoCache);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await getSystemInfo();
      systemInfoCache = info;
      setData(info);
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : 'Não foi possível carregar as informações do sistema.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!systemInfoCache) {
      void fetchSystemInfo();
    }
  }, [fetchSystemInfo]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchSystemInfo
  };
}
