import type { SystemInfo } from './system';
import type { CleanupId, CleanupListResult, CleanupRunResult } from './cleanup';
import type {
  CreateRestorePointResult,
  OptimizationActionResult,
  OptimizationId,
  OptimizationListResult,
  OptimizationStatusResult
} from './optimization';

export interface ItoBoostWindowApi {
  system: {
    getInfo: () => Promise<SystemInfo>;
    isAdmin: () => Promise<boolean>;
    createRestorePoint: () => Promise<CreateRestorePointResult>;
  };
  optimization: {
    getAll: () => Promise<OptimizationListResult>;
    getStatus: (id: OptimizationId) => Promise<OptimizationStatusResult>;
    apply: (id: OptimizationId) => Promise<OptimizationActionResult>;
    revert: (id: OptimizationId) => Promise<OptimizationActionResult>;
  };
  cleanup: {
    getAll: () => Promise<CleanupListResult>;
    run: (ids: CleanupId[]) => Promise<CleanupRunResult>;
  };
  windowControls: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
  };
}

declare global {
  interface Window {
    itoBoost?: ItoBoostWindowApi;
  }
}

export {};
