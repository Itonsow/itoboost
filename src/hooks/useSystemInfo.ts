import { useCallback, useEffect, useRef, useState } from 'react';
import { getSystemInfo } from '../services/systemService';
import { isOperationRunning } from '../services/operationState';
import type { SystemInfo } from '../types/system';

interface UseSystemInfoResult {
  data: SystemInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface SystemInfoRequest {
  id: number;
  promise: Promise<SystemInfo>;
}

let systemInfoCache: SystemInfo | null = null;
let nextSystemInfoRequestId = 0;
let latestSystemInfoRequestId = 0;
let systemInfoInFlight: SystemInfoRequest | null = null;

function getSystemInfoRequest(force: boolean): SystemInfoRequest {
  if (systemInfoInFlight && !force) return systemInfoInFlight;

  const request: SystemInfoRequest = {
    id: ++nextSystemInfoRequestId,
    promise: getSystemInfo()
  };
  latestSystemInfoRequestId = request.id;
  systemInfoInFlight = request;
  void request.promise.then(
    () => {
      if (systemInfoInFlight === request) systemInfoInFlight = null;
    },
    () => {
      if (systemInfoInFlight === request) systemInfoInFlight = null;
    }
  );
  return request;
}

export function useSystemInfo(): UseSystemInfoResult {
  const [data, setData] = useState<SystemInfo | null>(() => systemInfoCache);
  const [isLoading, setIsLoading] = useState(() => !systemInfoCache);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const viewGenerationRef = useRef(0);

  const loadSystemInfo = useCallback(async (force: boolean) => {
    if (!mountedRef.current || isOperationRunning()) return;

    const request = getSystemInfoRequest(force);
    const generation = ++viewGenerationRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const info = await request.promise;
      if (
        !mountedRef.current ||
        generation !== viewGenerationRef.current ||
        request.id !== latestSystemInfoRequestId
      ) {
        return;
      }

      systemInfoCache = info;
      setData(info);
    } catch (unknownError) {
      if (
        !mountedRef.current ||
        generation !== viewGenerationRef.current ||
        request.id !== latestSystemInfoRequestId
      ) {
        return;
      }

      setError(
        unknownError instanceof Error
          ? unknownError.message
          : 'Não foi possível carregar as informações do sistema.'
      );
    } finally {
      if (mountedRef.current && generation === viewGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => loadSystemInfo(true), [loadSystemInfo]);

  useEffect(() => {
    mountedRef.current = true;
    if (!systemInfoCache) void loadSystemInfo(false);

    return () => {
      mountedRef.current = false;
      viewGenerationRef.current += 1;
    };
  }, [loadSystemInfo]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
}
