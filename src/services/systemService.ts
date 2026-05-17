import type { SystemInfo } from '../types/system';

export async function getSystemInfo(): Promise<SystemInfo> {
  if (!window.itoBoost?.system) {
    throw new Error('A API segura do ItoBoost não está disponível neste ambiente.');
  }

  return window.itoBoost.system.getInfo();
}
