import { ipcMain, WebContents } from 'electron';
import { ChildProcessByStdio, spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import type { Readable } from 'node:stream';
import type {
  ApiResponse,
  OllamaModel,
  OllamaModelInfo,
  OllamaRuntimeState,
  OllamaStatus,
  PullProgressEvent,
  StreamRequest
} from '../../renderer/types/ipc.js';
import {
  ensureOllamaReady,
  getOllamaStatus,
  installOllama,
  isOllamaRunning,
  stopOllamaService,
  type OllamaEnsureError
} from '../services/ollamaManager.js';

const OLLAMA_BASE_URL = process.env.MODELDECK_OLLAMA_URL ?? 'http://127.0.0.1:11434';
const ollamaStreamControllers = new Map<string, AbortController>();
type PullProcess = ChildProcessByStdio<null, Readable, Readable>;
const ollamaPullProcesses = new Map<string, PullProcess>();

interface OllamaTagResponse {
  models?: Array<{
    name: string;
    model?: string;
    size?: number;
  }>;
}

interface OllamaChatStreamChunk {
  done?: boolean;
  error?: string;
  message?: {
    content?: string;
  };
}

interface CancelPayload {
  sessionId: string;
}

interface PullPayload {
  model: string;
  sessionId: string;
}

interface CancelPullPayload {
  model: string;
}

interface DeleteModelPayload {
  model: string;
}

interface GetModelInfoPayload {
  model: string;
}

interface RestartModelPayload {
  model: string;
}

interface KeepWarmPayload {
  model: string;
  enabled: boolean;
}

interface OllamaPsResponse {
  models?: Array<{
    name?: string;
    model?: string;
    size_vram?: number;
  }>;
}

type PullStartResponse = ApiResponse<{ accepted: boolean }>;

interface PullAttemptResult {
  success: boolean;
  canceled: boolean;
  errorText?: string;
}

function buildPromptWithContext(payload: StreamRequest): string {
  const sections: string[] = [payload.prompt];

  if (payload.projectMode?.enabled) {
    sections.push('\n[Project Mode]\nTreat this request as part of an ongoing project context and preserve implementation consistency across files.');
  }

  if (payload.attachments && payload.attachments.length > 0) {
    sections.push('\n[Attached Files Context]');

    for (const file of payload.attachments) {
      const truncatedContent = file.content.length > 20000
        ? `${file.content.slice(0, 20000)}\n... [truncated]`
        : file.content;

      sections.push(
        `\nFile: ${file.name} (${file.extension}, ${file.sizeBytes} bytes)\n\n\`\`\`${file.extension}\n${truncatedContent}\n\`\`\``
      );
    }
  }

  return sections.join('\n');
}

/**
 * Sends an IPC event only if the renderer process is still alive.
 */
function safeSend(webContents: WebContents, channel: string, payload: unknown): void {
  if (!webContents.isDestroyed()) {
    webContents.send(channel, payload);
  }
}

/**
 * Parses newline-delimited JSON chunks from an Ollama stream body.
 */
async function* iterateJsonLines(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal
): AsyncGenerator<Record<string, unknown>> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      yield JSON.parse(trimmed) as Record<string, unknown>;
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    yield JSON.parse(trailing) as Record<string, unknown>;
  }
}

/**
 * Builds the Ollama request body from stream payload input.
 */
function buildOllamaRequestBody(payload: StreamRequest): Record<string, unknown> {
  if (payload.rawJsonPayload) {
    const parsed = JSON.parse(payload.rawJsonPayload) as Record<string, unknown>;
    return {
      ...parsed,
      model: payload.modelId,
      stream: true
    };
  }

  return {
    model: payload.modelId,
    stream: true,
    messages: [
      ...(payload.systemPrompt
        ? [{ role: 'system', content: payload.systemPrompt }]
        : []),
      { role: 'user', content: buildPromptWithContext(payload) }
    ],
    options: {
      temperature: payload.temperature,
      top_p: payload.topP,
      num_predict: payload.maxTokens,
      frequency_penalty: payload.frequencyPenalty
    }
  };
}

/**
 * Streams Ollama output and forwards token chunks to the renderer.
 */
async function runOllamaStream(
  webContents: WebContents,
  payload: StreamRequest,
  controller: AbortController
): Promise<void> {
  try {
    const body = buildOllamaRequestBody(payload);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      const responseText = await response.text();
      let parsedError = responseText;

      try {
        const parsed = JSON.parse(responseText) as { error?: string };
        parsedError = parsed.error ?? responseText;
      } catch {
        // Keep raw response text when body is not JSON.
      }

      if (response.status === 404) {
        if (parsedError.toLowerCase().includes('model')) {
          throw new Error(
            `Model '${payload.modelId}' is not available in Ollama. Download it from Model Library first.`
          );
        }

        throw new Error(
          'Ollama chat endpoint returned 404. Update Ollama and verify the local service is running correctly.'
        );
      }

      throw new Error(parsedError || `Ollama chat failed with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Ollama stream body was empty.');
    }

    for await (const rawChunk of iterateJsonLines(response.body, controller.signal)) {
      const chunk = rawChunk as OllamaChatStreamChunk;
      if (chunk.error) {
        throw new Error(chunk.error);
      }

      const token = chunk.message?.content ?? '';
      if (token) {
        safeSend(webContents, 'ollama:chunk', {
          sessionId: payload.sessionId,
          chunk: token
        });
      }
    }

    safeSend(webContents, 'ollama:done', { sessionId: payload.sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Ollama stream error.';
    const isAbort =
      (error instanceof Error && error.name === 'AbortError') || controller.signal.aborted;

    safeSend(webContents, 'ollama:error', {
      sessionId: payload.sessionId,
      error: isAbort ? 'Stream canceled by user.' : message
    });
  } finally {
    ollamaStreamControllers.delete(payload.sessionId);
  }
}

/**
 * Normalizes known ensure-ready error codes from thrown errors.
 */
function extractEnsureError(error: unknown): OllamaEnsureError | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message === 'OLLAMA_NOT_INSTALLED' || error.message === 'OLLAMA_FAILED_TO_START') {
    return error.message;
  }

  return null;
}

/**
 * Starts a model pull using the Ollama CLI and emits progress events from stdout/stderr lines.
 */
function runOllamaPull(
  webContents: WebContents,
  payload: PullPayload,
  pullTarget: string
): Promise<PullAttemptResult> {
  return new Promise((resolve) => {
    try {
      const child: PullProcess = spawn('ollama', ['pull', pullTarget], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const childEvents = child as unknown as NodeJS.EventEmitter;

    ollamaPullProcesses.set(payload.model, child);

    let outputBuffer = '';
    let fullOutput = '';

    const stripTerminalFormatting = (value: string): string => {
      // Strip ANSI CSI/OSC escape sequences so renderer only sees plain text progress.
      const withoutAnsi = value
        .replace(/\u001B\[[0-9;?]*[ -/]*[@-~]/g, '')
        .replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, '');

      return withoutAnsi.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    };

    const emitProgress = (text: string): void => {
      outputBuffer += text.replace(/\r/g, '\n');
      const parts = outputBuffer.split('\n');
      outputBuffer = parts.pop() ?? '';

      for (const rawLine of parts) {
        const line = stripTerminalFormatting(rawLine).trim();
        if (!line) {
          continue;
        }

        fullOutput += `${line}\n`;

        const percentMatch = line.match(/(\d+(?:\.\d+)?)%/);
        const percent = percentMatch ? Number.parseFloat(percentMatch[1]) : null;

        const progressPayload: PullProgressEvent = {
          sessionId: payload.sessionId,
          model: payload.model,
          status: line,
          percent: Number.isFinite(percent ?? Number.NaN) ? percent : null
        };

        safeSend(webContents, 'ollama:pull-progress', progressPayload);
      }
    };

    child.stdout?.on('data', (chunk: Buffer | string) => {
      emitProgress(chunk.toString());
    });

    child.stderr?.on('data', (chunk: Buffer | string) => {
      emitProgress(chunk.toString());
    });

    childEvents.on('error', (error: Error) => {
      ollamaPullProcesses.delete(payload.model);
      resolve({
        success: false,
        canceled: false,
        errorText: `Failed to start Ollama pull process: ${error.message}`
      });
    });

    childEvents.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      ollamaPullProcesses.delete(payload.model);

      const trailing = stripTerminalFormatting(outputBuffer).trim();
      if (trailing) {
        fullOutput += `${trailing}\n`;
        const percentMatch = trailing.match(/(\d+(?:\.\d+)?)%/);
        const percent = percentMatch ? Number.parseFloat(percentMatch[1]) : null;
        safeSend(webContents, 'ollama:pull-progress', {
          sessionId: payload.sessionId,
          model: payload.model,
          status: trailing,
          percent: Number.isFinite(percent ?? Number.NaN) ? percent : null
        } satisfies PullProgressEvent);
      }

      if (code === 0) {
        ollamaPullProcesses.delete(payload.model);
        resolve({
          success: true,
          canceled: false
        });
        return;
      }

      const canceled = signal === 'SIGTERM' || signal === 'SIGKILL';
      if (canceled) {
        resolve({
          success: false,
          canceled: true,
          errorText: 'Model download canceled by user.'
        });
        return;
      }

      resolve({
        success: false,
        canceled: false,
        errorText: fullOutput.trim() || `Ollama pull exited with code ${code ?? 'unknown'}.`
      });
    });
    } catch (error) {
      ollamaPullProcesses.delete(payload.model);
      resolve({
        success: false,
        canceled: false,
        errorText: error instanceof Error ? error.message : 'Failed to launch model pull.'
      });
    }
  });
}

function getPullTargets(model: string): string[] {
  const cleaned = model.trim();
  if (!cleaned) {
    return [];
  }

  const [base] = cleaned.split(':');
  const candidates = [cleaned, `${base}:latest`, base];

  return Array.from(new Set(candidates.filter((value) => value.trim().length > 0)));
}

function isMissingModelError(errorText: string): boolean {
  const normalized = errorText.toLowerCase();
  return (
    normalized.includes('manifest') ||
    normalized.includes('file does not exist') ||
    normalized.includes('model not found') ||
    normalized.includes('not found')
  );
}

/**
 * Returns best-effort VRAM memory usage from nvidia-smi in MiB.
 */
function readNvidiaVramUsageMiB(): { usedMb: number | null; totalMb: number | null } {
  try {
    const output = execSync('nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits', {
      encoding: 'utf8',
      timeout: 1500
    });

    const firstLine = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    if (!firstLine) {
      return { usedMb: null, totalMb: null };
    }

    const [usedRaw, totalRaw] = firstLine.split(',').map((part) => part.trim());
    const usedMb = Number.parseFloat(usedRaw ?? '');
    const totalMb = Number.parseFloat(totalRaw ?? '');

    return {
      usedMb: Number.isFinite(usedMb) ? usedMb : null,
      totalMb: Number.isFinite(totalMb) ? totalMb : null
    };
  } catch {
    return { usedMb: null, totalMb: null };
  }
}

/**
 * Aggregates active Ollama runtime state for UI telemetry.
 */
async function getOllamaRuntimeState(): Promise<OllamaRuntimeState> {
  const status = await getOllamaStatus();

  if (!status.running) {
    return {
      running: false,
      ready: status.ready,
      activeModels: [],
      vramUsedMb: null,
      vramTotalMb: null
    };
  }

  try {
    const psResponse = await fetch(`${OLLAMA_BASE_URL}/api/ps`, { method: 'GET' });
    if (!psResponse.ok) {
      throw new Error(`Ollama ps failed with status ${psResponse.status}`);
    }

    const psJson = (await psResponse.json()) as OllamaPsResponse;
    const activeModels = Array.from(
      new Set(
        (psJson.models ?? [])
          .map((item) => item.name ?? item.model ?? '')
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
      )
    );

    const nvidiaUsage = readNvidiaVramUsageMiB();
    const fallbackUsedFromPs = (psJson.models ?? []).reduce((sum, entry) => {
      if (!Number.isFinite(entry.size_vram ?? Number.NaN)) {
        return sum;
      }

      return sum + ((entry.size_vram ?? 0) / (1024 * 1024));
    }, 0);

    return {
      running: true,
      ready: status.ready,
      activeModels,
      vramUsedMb:
        nvidiaUsage.usedMb !== null
          ? Number(nvidiaUsage.usedMb.toFixed(1))
          : fallbackUsedFromPs > 0
            ? Number(fallbackUsedFromPs.toFixed(1))
            : null,
      vramTotalMb:
        nvidiaUsage.totalMb !== null
          ? Number(nvidiaUsage.totalMb.toFixed(1))
          : null
    };
  } catch {
    return {
      running: status.running,
      ready: status.ready,
      activeModels: [],
      vramUsedMb: null,
      vramTotalMb: null
    };
  }
}

/**
 * Sends a keep-alive or unload request for a single model.
 */
async function setModelKeepWarm(model: string, enabled: boolean): Promise<void> {
  const trimmed = model.trim();
  if (!trimmed) {
    return;
  }

  await ensureOllamaReady();

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: trimmed,
      prompt: '',
      stream: false,
      keep_alive: enabled ? '30m' : 0
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update keep-warm state for '${trimmed}'.`);
  }
}

/**
 * Restarts Ollama and optionally preloads the selected model.
 */
async function restartOllamaModel(model: string): Promise<void> {
  await stopOllamaServiceAndUnloadModels();
  await ensureOllamaReady();

  const trimmed = model.trim();
  if (trimmed) {
    await setModelKeepWarm(trimmed, true);
  }
}

/**
 * Unloads all active Ollama models to free VRAM and cancels local stream/pull tasks.
 */
async function stopOllamaServiceAndUnloadModels(): Promise<{ stopped: boolean; unloaded: number }> {
  for (const controller of ollamaStreamControllers.values()) {
    controller.abort();
  }
  ollamaStreamControllers.clear();

  for (const process of ollamaPullProcesses.values()) {
    process.kill('SIGTERM');
  }
  ollamaPullProcesses.clear();

  if (!(await isOllamaRunning())) {
    return { stopped: true, unloaded: 0 };
  }

  const psResponse = await fetch(`${OLLAMA_BASE_URL}/api/ps`, { method: 'GET' });
  if (!psResponse.ok) {
    throw new Error(`Ollama ps failed with status ${psResponse.status}`);
  }

  const psJson = (await psResponse.json()) as OllamaPsResponse;
  const activeModelNames = Array.from(
    new Set(
      (psJson.models ?? [])
        .map((item) => item.name ?? item.model ?? '')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    )
  );

  let unloaded = 0;
  for (const model of activeModelNames) {
    try {
      const unloadResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt: '',
          stream: false,
          keep_alive: 0
        })
      });

      if (unloadResponse.ok) {
        unloaded += 1;
      }
    } catch {
      // Continue unloading remaining models even if one fails.
    }
  }

  await stopOllamaService();

  return {
    stopped: true,
    unloaded
  };
}

/**
 * Ensures Ollama is installed/running and starts CLI pull task.
 */
async function handlePullStart(
  webContents: WebContents,
  payload: PullPayload
): Promise<PullStartResponse> {
  try {
    await ensureOllamaReady();

    const existing = ollamaPullProcesses.get(payload.model);
    if (existing) {
      existing.kill('SIGTERM');
    }

    const pullTargets = getPullTargets(payload.model);

    void (async () => {
      for (const target of pullTargets) {
        if (target !== payload.model) {
          safeSend(webContents, 'ollama:pull-progress', {
            sessionId: payload.sessionId,
            model: payload.model,
            status: `Retrying with ${target}...`,
            percent: null
          } satisfies PullProgressEvent);
        }

        const result = await runOllamaPull(webContents, payload, target);
        if (result.success) {
          safeSend(webContents, 'ollama:pull-complete', {
            sessionId: payload.sessionId,
            model: payload.model
          });
          return;
        }

        if (result.canceled) {
          safeSend(webContents, 'ollama:pull-error', {
            sessionId: payload.sessionId,
            model: payload.model,
            error: result.errorText ?? 'Model download canceled by user.'
          });
          return;
        }

        if (!isMissingModelError(result.errorText ?? '')) {
          safeSend(webContents, 'ollama:pull-error', {
            sessionId: payload.sessionId,
            model: payload.model,
            error: result.errorText ?? 'Failed to download model.'
          });
          return;
        }
      }

      safeSend(webContents, 'ollama:pull-error', {
        sessionId: payload.sessionId,
        model: payload.model,
        error: `Model '${payload.model}' is not available in the current Ollama library tags. Try a different size tag or pull ':latest'.`
      });
    })();

    return {
      success: true,
      data: {
        accepted: true
      }
    };
  } catch (error) {
    const knownError = extractEnsureError(error);
    return {
      success: false,
      error: knownError ?? (error instanceof Error ? error.message : 'Failed to start model download.')
    };
  }
}

/**
 * Registers Ollama IPC handlers.
 */
export function registerOllamaIpcHandlers(): void {
  ipcMain.removeHandler('ollama:list-models');
  ipcMain.handle('ollama:list-models', async (): Promise<ApiResponse<OllamaModel[]>> => {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Ollama tags request failed with status ${response.status}`);
      }

      const json = (await response.json()) as OllamaTagResponse;
      const models: OllamaModel[] = (json.models ?? []).map((model) => ({
        id: model.model ?? model.name,
        name: model.name,
        size: model.size
      }));

      return {
        success: true,
        data: models
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list Ollama models.'
      };
    }
  });

  ipcMain.removeHandler('ollama:check-availability');
  ipcMain.handle('ollama:check-availability', async (): Promise<ApiResponse<{ available: boolean }>> => {
    try {
      const running = await isOllamaRunning();

      return {
        success: true,
        data: {
          available: running
        }
      };
    } catch {
      return {
        success: true,
        data: {
          available: false
        }
      };
    }
  });

  ipcMain.removeHandler('ollama:stream-chat');
  ipcMain.handle(
    'ollama:stream-chat',
    async (event, payload: StreamRequest): Promise<ApiResponse<{ accepted: boolean }>> => {
      try {
        await ensureOllamaReady();

        const existing = ollamaStreamControllers.get(payload.sessionId);
        if (existing) {
          existing.abort();
        }

        const controller = new AbortController();
        ollamaStreamControllers.set(payload.sessionId, controller);
        void runOllamaStream(event.sender, payload, controller);

        return {
          success: true,
          data: {
            accepted: true
          }
        };
      } catch (error) {
        return {
          success: false,
          error:
            extractEnsureError(error) ??
            (error instanceof Error ? error.message : 'Failed to start Ollama stream.')
        };
      }
    }
  );

  ipcMain.removeHandler('ollama:status');
  ipcMain.handle('ollama:status', async (): Promise<ApiResponse<OllamaStatus>> => {
    try {
      const status = await getOllamaStatus();
      return {
        success: true,
        data: status
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read Ollama status.'
      };
    }
  });

  ipcMain.removeHandler('ollama:ensure-ready');
  ipcMain.handle('ollama:ensure-ready', async (): Promise<ApiResponse<{ ready: boolean }>> => {
    try {
      await ensureOllamaReady();
      return {
        success: true,
        data: {
          ready: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: extractEnsureError(error) ?? 'OLLAMA_FAILED_TO_START'
      };
    }
  });

  ipcMain.removeHandler('ollama:install');
  ipcMain.handle('ollama:install', async (): Promise<ApiResponse<{ opened: boolean }>> => {
    try {
      const result = await installOllama();
      if (!result.success) {
        return {
          success: false,
          error: result.error ?? 'INSTALL_LAUNCH_FAILED'
        };
      }

      return {
        success: true,
        data: {
          opened: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'INSTALL_LAUNCH_FAILED'
      };
    }
  });

  ipcMain.removeHandler('ollama:stop-service');
  ipcMain.handle('ollama:stop-service', async (): Promise<ApiResponse<{ stopped: boolean; unloaded: number }>> => {
    try {
      const result = await stopOllamaServiceAndUnloadModels();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop Ollama service.'
      };
    }
  });

  ipcMain.removeHandler('ollama:cancel-stream');
  ipcMain.handle(
    'ollama:cancel-stream',
    async (_event, payload: CancelPayload): Promise<ApiResponse<{ canceled: boolean }>> => {
      try {
        const controller = ollamaStreamControllers.get(payload.sessionId);
        if (!controller) {
          return {
            success: true,
            data: {
              canceled: false
            }
          };
        }

        controller.abort();
        return {
          success: true,
          data: {
            canceled: true
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to cancel Ollama stream.'
        };
      }
    }
  );

  ipcMain.removeHandler('ollama:pull-model');
  ipcMain.handle(
    'ollama:pull-model',
    async (event, payload: PullPayload): Promise<ApiResponse<{ accepted: boolean }>> =>
      handlePullStart(event.sender, payload)
  );

  ipcMain.removeHandler('models:pull');
  ipcMain.handle(
    'models:pull',
    async (event, payload: PullPayload): Promise<ApiResponse<{ accepted: boolean }>> =>
      handlePullStart(event.sender, payload)
  );

  ipcMain.removeHandler('ollama:cancel-pull');
  ipcMain.handle(
    'ollama:cancel-pull',
    async (_event, payload: CancelPullPayload): Promise<ApiResponse<{ canceled: boolean }>> => {
      try {
        const process = ollamaPullProcesses.get(payload.model);
        if (!process) {
          return {
            success: true,
            data: {
              canceled: false
            }
          };
        }

        process.kill('SIGTERM');
        ollamaPullProcesses.delete(payload.model);

        return {
          success: true,
          data: {
            canceled: true
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to cancel model download.'
        };
      }
    }
  );

  ipcMain.removeHandler('ollama:delete-model');
  ipcMain.handle(
    'ollama:delete-model',
    async (_event, payload: DeleteModelPayload): Promise<ApiResponse<{ deleted: boolean }>> => {
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ model: payload.model })
        });

        if (!response.ok) {
          throw new Error(`Ollama delete failed with status ${response.status}`);
        }

        return {
          success: true,
          data: {
            deleted: true
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete model.'
        };
      }
    }
  );

  ipcMain.removeHandler('ollama:get-model-info');
  ipcMain.handle(
    'ollama:get-model-info',
    async (_event, payload: GetModelInfoPayload): Promise<ApiResponse<OllamaModelInfo>> => {
      try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/show`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ model: payload.model })
        });

        if (!response.ok) {
          throw new Error(`Ollama show failed with status ${response.status}`);
        }

        const info = (await response.json()) as OllamaModelInfo;
        return {
          success: true,
          data: info
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch model info.'
        };
      }
    }
  );

  ipcMain.removeHandler('ollama:runtime-state');
  ipcMain.handle('ollama:runtime-state', async (): Promise<ApiResponse<OllamaRuntimeState>> => {
    try {
      return {
        success: true,
        data: await getOllamaRuntimeState()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read Ollama runtime state.'
      };
    }
  });

  ipcMain.removeHandler('ollama:restart-model');
  ipcMain.handle(
    'ollama:restart-model',
    async (_event, payload: RestartModelPayload): Promise<ApiResponse<{ restarted: boolean }>> => {
      try {
        await restartOllamaModel(payload.model);

        return {
          success: true,
          data: {
            restarted: true
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to restart model.'
        };
      }
    }
  );

  ipcMain.removeHandler('ollama:keep-warm');
  ipcMain.handle(
    'ollama:keep-warm',
    async (_event, payload: KeepWarmPayload): Promise<ApiResponse<{ success: boolean }>> => {
      try {
        await setModelKeepWarm(payload.model, payload.enabled);

        return {
          success: true,
          data: {
            success: true
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update keep-warm state.'
        };
      }
    }
  );
}
