import type { CleanupId, CleanupListResult, CleanupRunResult } from '../types/cleanup';

function getApi() {
  if (!window.itoBoost?.cleanup) {
    throw new Error('A API segura de limpeza do ItoBoost não está disponível neste ambiente.');
  }

  return window.itoBoost.cleanup;
}

export async function getCleanupTasks(): Promise<CleanupListResult> {
  return getApi().getAll();
}

export async function runCleanup(ids: CleanupId[]): Promise<CleanupRunResult> {
  return getApi().run(ids);
}
