import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, shell } from 'electron';
import { registerApiIpcHandlers } from './ipc/api.js';
import { registerOllamaIpcHandlers } from './ipc/ollama.js';
import { registerSessionIpcHandlers } from './ipc/sessions.js';
import { registerSystemIpcHandlers } from './ipc/system.js';

let mainWindow: BrowserWindow | null = null;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Uses a safe Linux IME fallback when IBUS is not configured in the session.
 */
function configureLinuxInputMethodFallback(): void {
  if (process.platform !== 'linux') {
    return;
  }

  const currentGtkIm = (process.env.GTK_IM_MODULE ?? '').toLowerCase();
  const currentXModifiers = (process.env.XMODIFIERS ?? '').toLowerCase();

  // Avoid IBUS by default because failed IBUS sessions can flood warnings and drop key events.
  if (!currentGtkIm || currentGtkIm === 'ibus') {
    process.env.GTK_IM_MODULE = 'xim';
  }

  if (!currentXModifiers || currentXModifiers.includes('@im=ibus')) {
    process.env.XMODIFIERS = '@im=none';
  }
}

/**
 * Registers all ipcMain handlers for the application.
 */
function registerIpcHandlers(): void {
  registerOllamaIpcHandlers();
  registerApiIpcHandlers();
  registerSystemIpcHandlers();
  registerSessionIpcHandlers();
}

/**
 * Resolves the renderer URL based on environment.
 */
function getRendererUrl(): string {
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }

  // ASSUMPTION: Packaged renderer export is emitted under renderer/out/index.html.
  const indexPath = path.join(app.getAppPath(), 'renderer', 'out', 'index.html');
  return `file://${indexPath}`;
}

/**
 * Creates the main application window.
 */
function createMainWindow(): BrowserWindow {
  const appIconPath = path.join(app.getAppPath(), 'renderer', 'public', 'favicon.svg');
  const window = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    backgroundColor: '#09090b',
    icon: appIconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const rendererUrl = getRendererUrl();
  void window.loadURL(rendererUrl);

  window.once('ready-to-show', () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  return window;
}

configureLinuxInputMethodFallback();

void app.whenReady().then(() => {
  registerIpcHandlers();
  mainWindow = createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
