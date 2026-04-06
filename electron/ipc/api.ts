import path from 'node:path';
import { app, ipcMain } from 'electron';
import net from 'node:net';
import { ChildProcess, spawn, spawnSync } from 'node:child_process';
import type { ApiResponse } from '../../renderer/types/ipc.js';
import { logError, logInfo, logWarn } from '../services/logger.js';

interface ApiStartPayload {
  modelId: string;
  port?: number;
}

interface ApiGeneratePayload {
  prompt: string;
  modelId?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

interface LocalApiServerStatus {
  running: boolean;
  endpoint: string;
  modelId: string;
  pid?: number;
}

const DEFAULT_PORT = Number.parseInt(process.env.MODELDECK_API_PORT ?? '8765', 10) || 8765;
const DEFAULT_MODEL = process.env.MODELDECK_API_DEFAULT_MODEL ?? 'llama3.1:8b';
let apiProcess: ChildProcess | null = null;
let currentPort = DEFAULT_PORT;
let currentModel = DEFAULT_MODEL;
let cleanupRegistered = false;
let restartAttempt = 0;
let keepServerAlive = false;

function getEndpoint(port: number): string {
  return `http://127.0.0.1:${port}`;
}

function getPythonEntryPath(): string {
  return path.join(app.getAppPath(), 'python', 'main.py');
}

function isCommandAvailable(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, {
    stdio: 'ignore'
  });

  return result.status === 0;
}

function resolvePythonCommand(): { command: string; argsPrefix: string[] } {
  if (process.platform === 'win32' && isCommandAvailable('py', ['-3', '--version'])) {
    return {
      command: 'py',
      argsPrefix: ['-3']
    };
  }

  if (isCommandAvailable('python3', ['--version'])) {
    return {
      command: 'python3',
      argsPrefix: []
    };
  }

  if (isCommandAvailable('python', ['--version'])) {
    return {
      command: 'python',
      argsPrefix: []
    };
  }

  throw new Error('Python runtime not found. Install Python 3.10+ and ensure it is available in PATH.');
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(preferredPort: number, searchWindow = 20): Promise<number> {
  for (let offset = 0; offset <= searchWindow; offset += 1) {
    const candidate = preferredPort + offset;
    if (candidate > 65535) {
      break;
    }

    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error(`No available local port found near ${preferredPort}.`);
}

function stopApiProcess(): void {
  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill(process.platform === 'win32' ? undefined : 'SIGTERM');
  }
  apiProcess = null;
}

function getStatus(): LocalApiServerStatus {
  return {
    running: Boolean(apiProcess && !apiProcess.killed),
    endpoint: getEndpoint(currentPort),
    modelId: currentModel,
    pid: apiProcess?.pid
  };
}

async function callGenerate(payload: ApiGeneratePayload): Promise<{ text: string }> {
  const response = await fetch(`${getEndpoint(currentPort)}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: payload.prompt,
      model: payload.modelId || currentModel,
      temperature: payload.temperature,
      top_p: payload.topP,
      max_tokens: payload.maxTokens,
      system_prompt: payload.systemPrompt
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API request failed with status ${response.status}`);
  }

  return (await response.json()) as { text: string };
}

async function waitForHealth(port: number, attempts = 30): Promise<void> {
  const endpoint = `${getEndpoint(port)}/health`;

  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep retrying while the process boots.
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
  }

  throw new Error('Local API did not become ready in time. Ensure Python dependencies are installed.');
}

async function startLocalApiProcess(payload: ApiStartPayload): Promise<LocalApiServerStatus> {
  if (apiProcess && !apiProcess.killed) {
    return getStatus();
  }

  keepServerAlive = true;
  currentPort = await findAvailablePort(payload.port ?? DEFAULT_PORT);
  currentModel = payload.modelId || DEFAULT_MODEL;

  const pythonRuntime = resolvePythonCommand();
  const pythonEntry = getPythonEntryPath();
  const child = spawn(
    pythonRuntime.command,
    [...pythonRuntime.argsPrefix, pythonEntry, '--host', '127.0.0.1', '--port', String(currentPort), '--model', currentModel],
    {
      cwd: app.getAppPath(),
      env: {
        ...process.env,
        MODELDECK_API_DEFAULT_MODEL: currentModel,
        MODELDECK_API_PORT: String(currentPort)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  child.stdout.on('data', (chunk) => {
    logInfo('Local API', chunk.toString().trim());
  });
  child.stderr.on('data', (chunk) => {
    logWarn('Local API', chunk.toString().trim());
  });
  child.once('exit', (code, signal) => {
    logWarn('Local API', `Exited (code=${String(code)}, signal=${String(signal)})`);
    apiProcess = null;

    // Attempt one restart for unexpected exits while API mode is enabled.
    if (keepServerAlive && restartAttempt < 1) {
      restartAttempt += 1;
      void startLocalApiProcess({ modelId: currentModel, port: currentPort }).catch((error) => {
        logError('Local API', error);
      });
    }
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      child.removeListener('spawn', onSpawn);
      reject(error);
    };

    const onSpawn = (): void => {
      child.removeListener('error', onError);
      resolve();
    };

    child.once('error', onError);
    child.once('spawn', onSpawn);
  });

  apiProcess = child;
  await waitForHealth(currentPort);
  logInfo('Local API', `Started at ${getEndpoint(currentPort)} using model ${currentModel}`);
  return getStatus();
}

export function registerApiIpcHandlers(): void {
  if (!cleanupRegistered) {
    app.on('before-quit', () => {
      keepServerAlive = false;
      stopApiProcess();
    });
    cleanupRegistered = true;
  }

  ipcMain.removeHandler('api:start-local-server');
  ipcMain.handle(
    'api:start-local-server',
    async (_event, payload: ApiStartPayload): Promise<ApiResponse<LocalApiServerStatus>> => {
      try {
        restartAttempt = 0;
        const status = await startLocalApiProcess(payload);

        return {
          success: true,
          data: status
        };
      } catch (error) {
        logError('Local API', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start local API server.'
        };
      }
    }
  );

  ipcMain.removeHandler('api:stop-local-server');
  ipcMain.handle('api:stop-local-server', async (): Promise<ApiResponse<LocalApiServerStatus>> => {
    try {
      keepServerAlive = false;
      stopApiProcess();
      restartAttempt = 0;

      return {
        success: true,
        data: getStatus()
      };
    } catch (error) {
      logError('Local API', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop local API server.'
      };
    }
  });

  ipcMain.removeHandler('api:local-server-status');
  ipcMain.handle('api:local-server-status', async (): Promise<ApiResponse<LocalApiServerStatus>> => {
    try {
      return {
        success: true,
        data: getStatus()
      };
    } catch (error) {
      logError('Local API', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read local API server status.'
      };
    }
  });

  ipcMain.removeHandler('api:generate-local');
  ipcMain.handle(
    'api:generate-local',
    async (_event, payload: ApiGeneratePayload): Promise<ApiResponse<{ text: string }>> => {
      try {
        const data = await callGenerate(payload);
        return {
          success: true,
          data
        };
      } catch (error) {
        logError('Local API', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to call local API.'
        };
      }
    }
  );
}
