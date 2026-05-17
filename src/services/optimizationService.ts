import type {
  CreateRestorePointResult,
  OptimizationActionResult,
  OptimizationId,
  OptimizationListResult,
  OptimizationStatusResult
} from '../types/optimization';

function getApi() {
  if (!window.itoBoost?.optimization || !window.itoBoost.system) {
    throw new Error('A API segura do ItoBoost não está disponível neste ambiente.');
  }

  return window.itoBoost;
}

export async function getOptimizations(): Promise<OptimizationListResult> {
  return getApi().optimization.getAll();
}

export async function getOptimizationStatus(id: OptimizationId): Promise<OptimizationStatusResult> {
  return getApi().optimization.getStatus(id);
}

export async function applyOptimization(id: OptimizationId): Promise<OptimizationActionResult> {
  return getApi().optimization.apply(id);
}

export async function revertOptimization(id: OptimizationId): Promise<OptimizationActionResult> {
  return getApi().optimization.revert(id);
}

export async function isRunningAsAdmin(): Promise<boolean> {
  return getApi().system.isAdmin();
}

export async function createRestorePoint(): Promise<CreateRestorePointResult> {
  return getApi().system.createRestorePoint();
}
