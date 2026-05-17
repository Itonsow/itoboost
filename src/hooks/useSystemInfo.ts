import { useEffect, useState } from 'react';
import { getSystemInfo } from '../services/systemService';
import type { SystemInfo } from '../types/system';

interface UseSystemInfoResult {
  data: SystemInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSystemInfo(): UseSystemInfoResult {
  const [data, setData] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemInfo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await getSystemInfo();
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
  };

  useEffect(() => {
    void fetchSystemInfo();
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchSystemInfo
  };
}
