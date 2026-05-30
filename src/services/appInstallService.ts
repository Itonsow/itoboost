import type { AppInstallId, AppInstallResult, AppListResult } from '../types/apps';

function getApi() {
  if (!window.itoBoost?.apps) {
    throw new Error('A API segura de apps do ItoBoost nao esta disponivel neste ambiente.');
  }

  return window.itoBoost.apps;
}

export async function getInstallableApps(): Promise<AppListResult> {
  return getApi().getAll();
}

export async function installApp(id: AppInstallId): Promise<AppInstallResult> {
  return getApi().install(id);
}
