import { app, BrowserWindow, ipcMain, Menu } from 'electron';
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

let mainWindow: BrowserWindow | null = null;

const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);

function emitMaximizedState(window: BrowserWindow) {
  window.webContents.send('window:maximized-changed', window.isMaximized());
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

  if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
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
  return createRestorePoint();
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

  return applyOptimization(id);
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

  return revertOptimization(id);
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
