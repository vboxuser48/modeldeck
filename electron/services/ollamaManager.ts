import { exec, spawn, spawnSync } from 'node:child_process';
import { logInfo, logWarn } from './logger.js';

const OLLAMA_BASE_URL = process.env.MODELDECK_OLLAMA_URL ?? 'http://127.0.0.1:11434';
const RUN_CHECK_TIMEOUT_MS = 1000;
const POLL_INTERVAL_MS = 500;
const INSTALL_CHECK_CACHE_TTL_MS = 10_000;

export type OllamaEnsureError = 'OLLAMA_NOT_INSTALLED' | 'OLLAMA_FAILED_TO_START';
export type OllamaInstallError = 'NO_TERMINAL_FOUND' | 'INSTALL_LAUNCH_FAILED';

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  ready: boolean;
  platform: 'win32' | 'linux' | 'darwin';
  installCommand: string;
}

export interface OllamaInstallResult {
  success: boolean;
  error?: OllamaInstallError;
}

let installCheckCache: { value: boolean; expiresAt: number } | null = null;
let installCheckInFlight: Promise<boolean> | null = null;
let lastLoggedInstallState: boolean | null = null;

function getOllamaInstallCommand(platform: NodeJS.Platform): string {
  if (platform === 'win32') {
    return 'winget install --id Ollama.Ollama -e';
  }

  if (platform === 'darwin') {
    return 'brew install --cask ollama';
  }

  return 'curl -fsSL https://ollama.com/install.sh | sh';
}

function getPlatform(): OllamaStatus['platform'] {
  if (process.platform === 'win32' || process.platform === 'linux' || process.platform === 'darwin') {
    return process.platform;
  }

  return 'linux';
}

function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probeCommand = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(probeCommand, [command], {
      stdio: 'ignore'
    });
    resolve(result.status === 0);
  });
}

function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

/**
 * Opens a system terminal and runs the official Ollama install command.
 */
export async function installOllama(): Promise<OllamaInstallResult> {
  logInfo('Ollama', 'Opening terminal for installation...');

  const platform = getPlatform();
  const installCommand = getOllamaInstallCommand(platform);

  try {
    if (platform === 'linux') {
      const terminals: Array<{ cmd: string; args: string[] }> = [
        {
          cmd: 'gnome-terminal',
          args: ['--', 'bash', '-lc', `${installCommand}; exec bash`]
        },
        {
          cmd: 'x-terminal-emulator',
          args: ['-e', 'bash', '-lc', `${installCommand}; exec bash`]
        },
        {
          cmd: 'konsole',
          args: ['-e', 'bash', '-lc', `${installCommand}; exec bash`]
        }
      ];

      for (const terminal of terminals) {
        if (!(await commandExists(terminal.cmd))) {
          continue;
        }

        try {
          const child = spawn(terminal.cmd, terminal.args, {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();

          return { success: true };
        } catch {
          continue;
        }
      }

      return {
        success: false,
        error: 'NO_TERMINAL_FOUND'
      };
    }

    if (platform === 'darwin') {
      const escaped = installCommand.replace(/"/g, '\\"');
      const appleScript = `tell application "Terminal" to do script "${escaped}"`;
      const child = spawn('osascript', ['-e', appleScript], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      return { success: true };
    }

    const powershellCommand = `powershell -NoExit -ExecutionPolicy Bypass -Command \"${installCommand}\"`;
    const child = spawn('cmd', ['/c', 'start', 'cmd', '/k', powershellCommand], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    return { success: true };
  } catch (error) {
    logWarn('Ollama', `Install launch failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      error: 'INSTALL_LAUNCH_FAILED'
    };
  }
}

/**
 * Detects whether Ollama is installed and available in PATH.
 */
export async function isOllamaInstalled(): Promise<boolean> {
  const now = Date.now();
  if (installCheckCache && installCheckCache.expiresAt > now) {
    return installCheckCache.value;
  }

  if (installCheckInFlight) {
    return installCheckInFlight;
  }

  installCheckInFlight = commandExists('ollama')
    .then((installed) => {
      installCheckCache = {
        value: installed,
        expiresAt: Date.now() + INSTALL_CHECK_CACHE_TTL_MS
      };

      if (lastLoggedInstallState !== installed) {
        logInfo('Ollama', `Installation detected: ${installed ? 'yes' : 'no'}`);
        lastLoggedInstallState = installed;
      }

      return installed;
    })
    .finally(() => {
      installCheckInFlight = null;
    });

  return installCheckInFlight;
}

/**
 * Detects whether Ollama is currently reachable on localhost.
 */
export async function isOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch(OLLAMA_BASE_URL, {
      signal: AbortSignal.timeout(RUN_CHECK_TIMEOUT_MS)
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Starts Ollama in the background and returns without blocking.
 */
export function startOllama(): void {
  logInfo('Ollama', 'Starting service...');

  try {
    const child = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
  } catch (error) {
    logWarn('Ollama', `Start failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Attempts to stop the Ollama service process.
 * Errors are intentionally swallowed because a "not running" state is acceptable.
 */
export async function stopOllamaService(): Promise<void> {
  const platform = getPlatform();

  try {
    if (platform === 'win32') {
      await runCommand('taskkill /IM ollama.exe /F');
      return;
    }

    if (await commandExists('pkill')) {
      await runCommand('pkill -f "ollama serve"');
      return;
    }

    if (await commandExists('killall')) {
      await runCommand('killall ollama');
    }
  } catch {
    // No-op: stopping is best-effort and should not crash the app.
  }
}

/**
 * Polls Ollama health endpoint until ready or timeout.
 */
export async function waitForOllama(timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const running = await isOllamaRunning();
    if (running) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return false;
}

/**
 * Ensures Ollama is installed and running, or throws a structured error code.
 */
export async function ensureOllamaReady(): Promise<void> {
  const installed = await isOllamaInstalled();
  if (!installed) {
    throw new Error('OLLAMA_NOT_INSTALLED');
  }

  let running = await isOllamaRunning();
  if (!running) {
    startOllama();
    running = await waitForOllama();
  }

  logInfo('Ollama', `Ready: ${String(running)}`);

  if (!running) {
    throw new Error('OLLAMA_FAILED_TO_START');
  }
}

/**
 * Returns install/run/ready status in one payload for UI checks.
 */
export async function getOllamaStatus(): Promise<OllamaStatus> {
  const platform = getPlatform();
  const installCommand = getOllamaInstallCommand(platform);

  const installed = await isOllamaInstalled();
  if (!installed) {
    return {
      installed: false,
      running: false,
      ready: false,
      platform,
      installCommand
    };
  }

  const running = await isOllamaRunning();
  return {
    installed,
    running,
    ready: installed && running,
    platform,
    installCommand
  };
}
