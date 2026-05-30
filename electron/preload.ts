import { contextBridge, ipcRenderer } from 'electron';
import type { ItoBoostWindowApi } from '../src/types/electron';
import type { CleanupId, CleanupListResult, CleanupRunResult } from '../src/types/cleanup';
import type {
  CreateRestorePointResult,
  OptimizationActionResult,
  OptimizationId,
  OptimizationListResult,
  OptimizationStatusResult
} from '../src/types/optimization';
import type { SystemInfo } from '../src/types/system';

const api: ItoBoostWindowApi = {
  system: {
    getInfo: () => ipcRenderer.invoke('system:get-info') as Promise<SystemInfo>,
    isAdmin: () => ipcRenderer.invoke('system:is-admin') as Promise<boolean>,
    createRestorePoint: () => ipcRenderer.invoke('system:create-restore-point') as Promise<CreateRestorePointResult>
  },
  optimization: {
    getAll: () => ipcRenderer.invoke('optimization:list') as Promise<OptimizationListResult>,
    getStatus: (id: OptimizationId) => ipcRenderer.invoke('optimization:status', id) as Promise<OptimizationStatusResult>,
    apply: (id: OptimizationId) => ipcRenderer.invoke('optimization:apply', id) as Promise<OptimizationActionResult>,
    revert: (id: OptimizationId) => ipcRenderer.invoke('optimization:revert', id) as Promise<OptimizationActionResult>
  },
  cleanup: {
    getAll: () => ipcRenderer.invoke('cleanup:list') as Promise<CleanupListResult>,
    run: (ids: CleanupId[]) => ipcRenderer.invoke('cleanup:run', ids) as Promise<CleanupRunResult>
  },
  windowControls: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    onMaximizedChange: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => {
        callback(isMaximized);
      };

      ipcRenderer.on('window:maximized-changed', listener);
      return () => ipcRenderer.removeListener('window:maximized-changed', listener);
    }
  }
};

contextBridge.exposeInMainWorld('itoBoost', api);
