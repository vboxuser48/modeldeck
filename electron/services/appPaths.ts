import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function getWindowsAppDataRoot(): string {
  const appData = process.env.APPDATA;
  if (appData && appData.trim().length > 0) {
    return appData;
  }

  return path.join(os.homedir(), 'AppData', 'Roaming');
}

function getModelDeckBaseDir(): string {
  if (process.platform === 'win32') {
    return path.join(getWindowsAppDataRoot(), 'ModelDeck');
  }

  return path.join(os.homedir(), '.modeldeck');
}

function ensureDirectory(dirPath: string): string {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function getModelDeckConfigDir(): string {
  return ensureDirectory(path.join(getModelDeckBaseDir(), 'config'));
}

export function getModelDeckCacheDir(): string {
  return ensureDirectory(path.join(getModelDeckBaseDir(), 'cache'));
}

export function getModelDeckLogsDir(): string {
  return ensureDirectory(path.join(getModelDeckBaseDir(), 'logs'));
}
