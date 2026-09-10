import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import path from 'node:path';
import { getSystemInfo } from './systemInfoService';
import { isRunningAsAdmin } from './services/adminService';
import { createRestorePoint } from './services/restorePointService';
import {
  applyOptimization,
  getOptimizationStatus,
  isOptimizationId,
  listOptimizations,
  revertOptimization
} from './services/windowsOptimizationService';
import { isCleanupId, listCleanupTasks, runCleanupTasks } from './services/windowsCleanupService';
import { installApp, isAppInstallId, listInstallableApps } from './services/appInstallService';
import { isMutableOperationActive, withOperationGate, type MutableOperation } from './services/operationGate';

let mainWindow: BrowserWindow | null = null;

const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function operationLabel(operation: MutableOperation): string {
  switch (operation) {
    case 'optimization':
      return 'de otimização';
    case 'cleanup':
      return 'de limpeza';
    case 'installation':
      return 'de instalação';
    case 'restore-point':
      return 'de criação do ponto de restauração';
    case 'process-recovery':
      return 'de recuperação de processo';
  }
}

function operationBusyMessage(operation: MutableOperation): string {
  if (operation === 'process-recovery') {
    return 'Uma operação anterior excedeu o tempo limite e o encerramento do processo não foi confirmado. Feche e reabra o ItoBoost antes de tentar novamente.';
  }

  return `Já existe uma operação ${operationLabel(operation)} em andamento. Aguarde a conclusão antes de tentar novamente.`;
}

function emitMaximizedState(window: BrowserWindow) {
  if (window.isDestroyed() || window.webContents.isDestroyed()) return;
  window.webContents.send('window:maximized-changed', window.isMaximized());
}

async function loadRenderer(window: BrowserWindow): Promise<void> {
  try {
    if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
      await window.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      await window.loadFile(path.join(__dirname, '../../dist/index.html'));
    }
  } catch (unknownError) {
    const message = unknownError instanceof Error ? unknownError.message : 'erro desconhecido';
    console.error('[ItoBoost] Não foi possível carregar a interface:', message);

    if (!window.isDestroyed()) {
      window.show();
      dialog.showErrorBox('ItoBoost', `Não foi possível carregar a interface do aplicativo.\n\n${message}`);
    }
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 1120,
    minHeight: 720,
    frame: false,
    show: false,
    backgroundColor: '#050814',
    title: 'ItoBoost',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('maximize', () => mainWindow && emitMaximizedState(mainWindow));
  mainWindow.on('unmaximize', () => mainWindow && emitMaximizedState(mainWindow));

  let closeDialogOpen = false;
  mainWindow.on('close', (event) => {
    if (!isMutableOperationActive()) return;

    event.preventDefault();
    if (closeDialogOpen || mainWindow?.isDestroyed()) return;

    closeDialogOpen = true;
    const window = mainWindow;
    if (!window) {
      closeDialogOpen = false;
      return;
    }

    void dialog
      .showMessageBox(window, {
        type: 'info',
        buttons: ['OK'],
        title: 'Operação em andamento',
        message: 'O ItoBoost está executando uma operação do Windows.',
        detail: 'A janela será liberada quando a operação terminar. Tente fechá-la novamente depois.'
      })
      .catch((error) => {
        console.error('[ItoBoost] Não foi possível mostrar o aviso de fechamento:', errorDetail(error));
      })
      .finally(() => {
        closeDialogOpen = false;
      });
  });

  void loadRenderer(mainWindow);
}

void app.whenReady()
  .then(() => {
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  })
  .catch((unknownError) => {
    console.error('[ItoBoost] Falha ao iniciar o aplicativo:', unknownError);
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('system:get-info', async () => {
  return getSystemInfo();
});

ipcMain.handle('system:is-admin', async () => {
  return isRunningAsAdmin();
});

ipcMain.handle('system:create-restore-point', async () => {
  return withOperationGate(
    'restore-point',
    async () => {
      try {
        return await createRestorePoint();
      } catch (error) {
        return { success: false, message: `Não foi possível criar o ponto de restauração. Detalhes: ${errorDetail(error)}` };
      }
    },
    (activeOperation) => ({ success: false, message: operationBusyMessage(activeOperation) })
  );
});

ipcMain.handle('optimization:list', async () => {
  return listOptimizations();
});

ipcMain.handle('optimization:status', async (_event, id: unknown) => {
  if (!isOptimizationId(id)) {
    return { id: 'unknown', status: 'unknown', message: 'Otimização inválida.' };
  }

  return getOptimizationStatus(id);
});

ipcMain.handle('optimization:apply', async (_event, id: unknown) => {
  if (!isOptimizationId(id)) {
    return {
      success: false,
      message: 'Otimização inválida.',
      requiresRestart: false,
      requiresExplorerRestart: false
    };
  }

  return withOperationGate(
    'optimization',
    async () => {
      try {
        return await applyOptimization(id);
      } catch (error) {
        return {
          success: false,
          message: `Não foi possível aplicar a otimização. Detalhes: ${errorDetail(error)}`,
          requiresRestart: false,
          requiresExplorerRestart: false
        };
      }
    },
    (activeOperation) => ({
      success: false,
      message: operationBusyMessage(activeOperation),
      requiresRestart: false,
      requiresExplorerRestart: false
    })
  );
});

ipcMain.handle('optimization:revert', async (_event, id: unknown) => {
  if (!isOptimizationId(id)) {
    return {
      success: false,
      message: 'Otimização inválida.',
      requiresRestart: false,
      requiresExplorerRestart: false
    };
  }

  return withOperationGate(
    'optimization',
    async () => {
      try {
        return await revertOptimization(id);
      } catch (error) {
        return {
          success: false,
          message: `Não foi possível reverter a otimização. Detalhes: ${errorDetail(error)}`,
          requiresRestart: false,
          requiresExplorerRestart: false
        };
      }
    },
    (activeOperation) => ({
      success: false,
      message: operationBusyMessage(activeOperation),
      requiresRestart: false,
      requiresExplorerRestart: false
    })
  );
});

ipcMain.handle('cleanup:list', async () => {
  return listCleanupTasks();
});

ipcMain.handle('cleanup:run', async (_event, ids: unknown) => {
  if (!Array.isArray(ids)) {
    return {
      success: false,
      message: 'Seleção de limpeza inválida.',
      cleanedBytes: null,
      requiresExplorerRestart: false,
      results: [],
      lastCleanupAt: null
    };
  }

  return withOperationGate(
    'cleanup',
    async () => {
      try {
        return await runCleanupTasks(ids.filter(isCleanupId));
      } catch (error) {
        return {
          success: false,
          message: `Não foi possível concluir a limpeza. Detalhes: ${errorDetail(error)}`,
          cleanedBytes: null,
          requiresExplorerRestart: false,
          results: [],
          lastCleanupAt: null
        };
      }
    },
    (activeOperation) => ({
      success: false,
      message: operationBusyMessage(activeOperation),
      cleanedBytes: null,
      requiresExplorerRestart: false,
      results: [],
      lastCleanupAt: null
    })
  );
});

ipcMain.handle('apps:list', async () => {
  return listInstallableApps();
});

ipcMain.handle('apps:install', async (_event, id: unknown) => {
  if (!isAppInstallId(id)) {
    return {
      id: 'brave',
      success: false,
      message: 'Aplicativo invalido.',
      status: 'unknown'
    };
  }

  return withOperationGate(
    'installation',
    async () => {
      try {
        return await installApp(id);
      } catch (error) {
        return {
          id,
          success: false,
          message: `Não foi possível concluir a instalação. Detalhes: ${errorDetail(error)}`,
          status: 'unknown' as const
        };
      }
    },
    (activeOperation) => ({
      id,
      success: false,
      message: operationBusyMessage(activeOperation),
      status: 'unknown' as const
    })
  );
});

ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on('window:toggle-maximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;

  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }
});

ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});
