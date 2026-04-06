import { create } from 'zustand';
import type { PullCompleteEvent, PullErrorEvent, PullProgressEvent } from '@/types/ipc';
import type { DownloadStatus } from '@/types/model';

const OLLAMA_INSTALL_COMMAND = 'curl -fsSL https://ollama.com/install.sh | sh';
const INSTALL_POLL_INTERVAL_MS = 2500;
const INSTALL_DETECTION_TIMEOUT_MS = 10 * 60 * 1000;

export interface DownloadEntry {
  model: string;
  status: DownloadStatus;
  percent: number | null;
  totalBytes: number | null;
  doneBytes: number | null;
  statusText: string;
  error: string | null;
  errorCode?: 'OLLAMA_NOT_INSTALLED' | 'OLLAMA_FAILED_TO_START';
  installCommand?: string;
  startedAt: number;
  completedAt: number | null;
}

interface DownloadsStore {
  downloads: Map<string, DownloadEntry>;
  listenersRegistered: boolean;
  startDownload: (model: string) => Promise<void>;
  installOllamaAndResume: (model: string) => Promise<void>;
  updateProgress: (model: string, event: PullProgressEvent) => void;
  markComplete: (model: string) => void;
  markError: (
    model: string,
    error: string,
    code?: 'OLLAMA_NOT_INSTALLED' | 'OLLAMA_FAILED_TO_START',
    installCommand?: string
  ) => void;
  cancelDownload: (model: string) => Promise<void>;
  clearCompleted: () => void;
  isDownloading: (model: string) => boolean;
  registerPullListeners: () => void;
  unregisterPullListeners: () => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createQueuedEntry(model: string): DownloadEntry {
  return {
    model,
    status: 'queued',
    percent: null,
    totalBytes: null,
    doneBytes: null,
    statusText: 'queued',
    error: null,
    errorCode: undefined,
    installCommand: undefined,
    startedAt: Date.now(),
    completedAt: null
  };
}

function mapEnsureError(
  code: string,
  installCommand?: string
): {
  message: string;
  code?: 'OLLAMA_NOT_INSTALLED' | 'OLLAMA_FAILED_TO_START';
  installCommand?: string;
} {
  if (code === 'OLLAMA_NOT_INSTALLED') {
    return {
      code,
      message: 'Ollama is not installed. Install to continue.',
      installCommand: installCommand ?? OLLAMA_INSTALL_COMMAND
    };
  }

  if (code === 'OLLAMA_FAILED_TO_START') {
    return {
      code,
      message: 'Ollama failed to start automatically. Please retry or start it manually and try again.'
    };
  }

  return {
    message: code
  };
}

/**
 * Tracks active and completed Ollama model downloads.
 */
export const useDownloadsStore = create<DownloadsStore>((set, get) => ({
  downloads: new Map<string, DownloadEntry>(),
  listenersRegistered: false,

  registerPullListeners: (): void => {
    if (get().listenersRegistered) {
      return;
    }

    const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
    if (!bridge) {
      return;
    }

    bridge.ollama.onPullProgress((event: PullProgressEvent) => {
      get().updateProgress(event.model, event);
    });
    bridge.ollama.onPullComplete((event: PullCompleteEvent) => {
      get().markComplete(event.model);
    });
    bridge.ollama.onPullError((event: PullErrorEvent) => {
      get().markError(event.model, event.error);
    });

    set({ listenersRegistered: true });
  },

  unregisterPullListeners: (): void => {
    const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
    bridge?.ollama.offPullListeners();
    set({ listenersRegistered: false });
  },

  startDownload: async (model: string): Promise<void> => {
    get().registerPullListeners();

    set((state) => {
      const next = new Map(state.downloads);
      next.set(model, createQueuedEntry(model));
      return { downloads: next };
    });

    const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
    if (!bridge) {
      get().markError(model, 'Electron API unavailable in browser-only runtime.');
      return;
    }

    set((state) => {
      const current = state.downloads.get(model) ?? createQueuedEntry(model);
      const next = new Map(state.downloads);
      next.set(model, {
        ...current,
        statusText: 'Starting Ollama...'
      });
      return { downloads: next };
    });

    try {
      const ensured = await bridge.ollama.ensureReady();
      if (!ensured.success) {
        const status = await bridge.ollama.status();
        const mapped = mapEnsureError(
          ensured.error ?? 'OLLAMA_FAILED_TO_START',
          status.success ? status.data?.installCommand : undefined
        );
        get().markError(model, mapped.message, mapped.code, mapped.installCommand);
        return;
      }
    } catch (error) {
      const status = await bridge.ollama.status();
      const mapped = mapEnsureError(
        error instanceof Error ? error.message : 'OLLAMA_FAILED_TO_START',
        status.success ? status.data?.installCommand : undefined
      );
      get().markError(model, mapped.message, mapped.code, mapped.installCommand);
      return;
    }

    const sessionId = crypto.randomUUID();
    try {
      const result = await bridge.ollama.pullModel(model, sessionId);
      if (!result.success) {
        get().markError(
          model,
          result.error ?? 'Failed to start model download via Ollama. Ensure Ollama is running.'
        );
        return;
      }
    } catch (error) {
      get().markError(
        model,
        error instanceof Error
          ? `Failed to start download: ${error.message}`
          : 'Failed to start download. Ensure Ollama is running.'
      );
      return;
    }

    set((state) => {
      const current = state.downloads.get(model);
      if (!current) {
        return state;
      }

      const next = new Map(state.downloads);
      next.set(model, {
        ...current,
        status: 'downloading',
        statusText: 'pulling model...'
      });
      return { downloads: next };
    });
  },

  installOllamaAndResume: async (model: string): Promise<void> => {
    get().registerPullListeners();

    set((state) => {
      const current = state.downloads.get(model) ?? createQueuedEntry(model);
      const next = new Map(state.downloads);
      next.set(model, {
        ...current,
        status: 'queued',
        statusText: 'Opening terminal...',
        error: null,
        errorCode: undefined,
        installCommand: current.installCommand ?? OLLAMA_INSTALL_COMMAND,
        completedAt: null
      });
      return { downloads: next };
    });

    const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
    if (!bridge) {
      get().markError(model, 'Electron API unavailable in browser-only runtime.');
      return;
    }

    const statusBeforeInstall = await bridge.ollama.status();
    const platformInstallCommand = statusBeforeInstall.success
      ? statusBeforeInstall.data?.installCommand
      : undefined;

    const launched = await bridge.ollama.install();
    if (!launched.success) {
      if (launched.error === 'NO_TERMINAL_FOUND') {
        get().markError(
          model,
          'No terminal application found. Install Ollama manually with the command below.',
          'OLLAMA_NOT_INSTALLED',
          platformInstallCommand
        );
        return;
      }

      get().markError(
        model,
        'Failed to open installer terminal. Please run the install command manually.',
        'OLLAMA_NOT_INSTALLED',
        platformInstallCommand
      );
      return;
    }

    set((state) => {
      const current = state.downloads.get(model) ?? createQueuedEntry(model);
      const next = new Map(state.downloads);
      next.set(model, {
        ...current,
        status: 'queued',
        statusText: 'Follow instructions in the opened terminal to complete installation.',
        installCommand: platformInstallCommand ?? current.installCommand ?? OLLAMA_INSTALL_COMMAND
      });
      return { downloads: next };
    });

    const startedAt = Date.now();
    while (Date.now() - startedAt < INSTALL_DETECTION_TIMEOUT_MS) {
      const current = get().downloads.get(model);
      if (current?.status === 'cancelled') {
        return;
      }

      await sleep(INSTALL_POLL_INTERVAL_MS);
      const status = await bridge.ollama.status();
      if (!status.success || !status.data?.installed) {
        continue;
      }

      set((state) => {
        const active = state.downloads.get(model) ?? createQueuedEntry(model);
        const next = new Map(state.downloads);
        next.set(model, {
          ...active,
          status: 'queued',
          statusText: 'Installation detected. Starting Ollama...'
        });
        return { downloads: next };
      });

      const ensured = await bridge.ollama.ensureReady();
      if (!ensured.success) {
        const mapped = mapEnsureError(ensured.error ?? 'OLLAMA_FAILED_TO_START', status.data.installCommand);
        get().markError(model, mapped.message, mapped.code, mapped.installCommand);
        return;
      }

      set((state) => {
        const active = state.downloads.get(model) ?? createQueuedEntry(model);
        const next = new Map(state.downloads);
        next.set(model, {
          ...active,
          status: 'queued',
          statusText: 'Ollama ready. Resuming download...'
        });
        return { downloads: next };
      });

      await get().startDownload(model);
      return;
    }

    get().markError(
      model,
      'Installation not detected yet. Complete the terminal steps, then click Download again.',
      'OLLAMA_NOT_INSTALLED',
      platformInstallCommand
    );
  },

  updateProgress: (model: string, event: PullProgressEvent): void => {
    set((state) => {
      const current = state.downloads.get(model) ?? createQueuedEntry(model);
      const next = new Map(state.downloads);
      next.set(model, {
        ...current,
        status: 'downloading',
        percent: event.percent,
        totalBytes: typeof event.total === 'number' ? event.total : current.totalBytes,
        doneBytes: typeof event.completed === 'number' ? event.completed : current.doneBytes,
        statusText: event.status,
        error: null,
        errorCode: undefined,
        completedAt: null
      });
      return { downloads: next };
    });
  },

  markComplete: (model: string): void => {
    set((state) => {
      const current = state.downloads.get(model) ?? createQueuedEntry(model);
      const next = new Map(state.downloads);
      next.set(model, {
        ...current,
        status: 'complete',
        percent: 100,
        statusText: 'success',
        completedAt: Date.now(),
        error: null,
        errorCode: undefined
      });
      return { downloads: next };
    });
  },

  markError: (model: string, error: string, code, installCommand): void => {
    set((state) => {
      const current = state.downloads.get(model) ?? createQueuedEntry(model);
      const next = new Map(state.downloads);
      next.set(model, {
        ...current,
        status: 'error',
        error,
        errorCode: code,
        installCommand,
        statusText: 'error',
        completedAt: Date.now()
      });
      return { downloads: next };
    });
  },

  cancelDownload: async (model: string): Promise<void> => {
    const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
    await bridge?.ollama.cancelPull(model);

    set((state) => {
      const next = new Map(state.downloads);

      const current = state.downloads.get(model);
      if (current?.status === 'queued') {
        next.delete(model);
        return { downloads: next };
      }

      const base = current ?? createQueuedEntry(model);
      next.set(model, {
        ...base,
        status: 'cancelled',
        statusText: 'cancelled',
        completedAt: Date.now(),
        error: null
      });
      return { downloads: next };
    });
  },

  clearCompleted: (): void => {
    set((state) => {
      const next = new Map<string, DownloadEntry>();
      for (const [key, value] of state.downloads.entries()) {
        if (value.status === 'downloading' || value.status === 'queued') {
          next.set(key, value);
        }
      }
      return { downloads: next };
    });
  },

  isDownloading: (model: string): boolean => {
    const item = get().downloads.get(model);
    return item?.status === 'queued' || item?.status === 'downloading';
  }
}));
