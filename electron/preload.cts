import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  ApiResponse,
  CpuRamSnapshot,
  HardwareProfile,
  LocalApiGenerateRequest,
  LocalApiServerStatus,
  ModelDeckApi,
  ModelDeckEvents,
  OllamaModel,
  OllamaModelInfo,
  OllamaRuntimeState,
  OllamaStatus,
  PullCompleteEvent,
  PullErrorEvent,
  PullProgressEvent,
  StreamChunkEvent,
  StreamDoneEvent,
  StreamErrorEvent,
  StreamRequest
} from '../renderer/types/ipc.js';
import type { WorkspaceSnapshot } from '../renderer/types/session.js';

/**
 * Creates a typed event subscription and returns an unsubscribe function.
 */
function onTypedEvent<TPayload>(
  channel: string,
  listener: (payload: TPayload) => void
): () => void {
  const wrapped = (_event: IpcRendererEvent, payload: TPayload) => listener(payload);
  ipcRenderer.on(channel, wrapped);

  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

const modeldeckEvents: ModelDeckEvents = {
  onOllamaChunk: (listener) => onTypedEvent<StreamChunkEvent>('ollama:chunk', listener),
  onOllamaDone: (listener) => onTypedEvent<StreamDoneEvent>('ollama:done', listener),
  onOllamaError: (listener) => onTypedEvent<StreamErrorEvent>('ollama:error', listener)
};

const modeldeckApi: ModelDeckApi = {
  ollama: {
    listModels: () => ipcRenderer.invoke('ollama:list-models') as Promise<ApiResponse<OllamaModel[]>>,
    checkAvailability: () =>
      ipcRenderer.invoke('ollama:check-availability') as Promise<ApiResponse<{ available: boolean }>>,
    status: () => ipcRenderer.invoke('ollama:status') as Promise<ApiResponse<OllamaStatus>>,
    ensureReady: () =>
      ipcRenderer.invoke('ollama:ensure-ready') as Promise<ApiResponse<{ ready: boolean }>>,
    install: () => ipcRenderer.invoke('ollama:install') as Promise<ApiResponse<{ opened: boolean }>>,
    stopService: () =>
      ipcRenderer.invoke('ollama:stop-service') as Promise<ApiResponse<{ stopped: boolean; unloaded: number }>>,
    streamChat: (payload: StreamRequest) =>
      ipcRenderer.invoke('ollama:stream-chat', payload) as Promise<ApiResponse<{ accepted: boolean }>>,
    cancelStream: (sessionId: string) =>
      ipcRenderer.invoke('ollama:cancel-stream', { sessionId }) as Promise<ApiResponse<{ canceled: boolean }>>,
    pullModel: (model: string, sessionId: string) =>
      ipcRenderer.invoke('ollama:pull-model', { model, sessionId }) as Promise<ApiResponse<{ accepted: boolean }>>,
    cancelPull: (model: string) =>
      ipcRenderer.invoke('ollama:cancel-pull', { model }) as Promise<ApiResponse<{ canceled: boolean }>>,
    deleteModel: (model: string) =>
      ipcRenderer.invoke('ollama:delete-model', { model }) as Promise<ApiResponse<{ deleted: boolean }>>,
    getModelInfo: (model: string) =>
      ipcRenderer.invoke('ollama:get-model-info', { model }) as Promise<ApiResponse<OllamaModelInfo>>,
    getRuntimeState: () =>
      ipcRenderer.invoke('ollama:runtime-state') as Promise<ApiResponse<OllamaRuntimeState>>,
    restartModel: (model: string) =>
      ipcRenderer.invoke('ollama:restart-model', { model }) as Promise<ApiResponse<{ restarted: boolean }>>,
    keepWarm: (model: string, enabled: boolean) =>
      ipcRenderer.invoke('ollama:keep-warm', { model, enabled }) as Promise<ApiResponse<{ success: boolean }>>,
    onPullProgress: (listener: (payload: PullProgressEvent) => void) => {
      ipcRenderer.on('ollama:pull-progress', (_event, payload: PullProgressEvent) => listener(payload));
    },
    onPullComplete: (listener: (payload: PullCompleteEvent) => void) => {
      ipcRenderer.on('ollama:pull-complete', (_event, payload: PullCompleteEvent) => listener(payload));
    },
    onPullError: (listener: (payload: PullErrorEvent) => void) => {
      ipcRenderer.on('ollama:pull-error', (_event, payload: PullErrorEvent) => listener(payload));
    },
    offPullListeners: () => {
      ipcRenderer.removeAllListeners('ollama:pull-progress');
      ipcRenderer.removeAllListeners('ollama:pull-complete');
      ipcRenderer.removeAllListeners('ollama:pull-error');
    }
  },
  api: {
    startLocalServer: (payload: { modelId: string; port?: number }) =>
      ipcRenderer.invoke('api:start-local-server', payload) as Promise<ApiResponse<LocalApiServerStatus>>,
    stopLocalServer: () =>
      ipcRenderer.invoke('api:stop-local-server') as Promise<ApiResponse<LocalApiServerStatus>>,
    getLocalServerStatus: () =>
      ipcRenderer.invoke('api:local-server-status') as Promise<ApiResponse<LocalApiServerStatus>>,
    generateLocal: (payload: LocalApiGenerateRequest) =>
      ipcRenderer.invoke('api:generate-local', payload) as Promise<ApiResponse<{ text: string }>>
  },
  system: {
    getCpuRam: () => ipcRenderer.invoke('system:cpu-ram') as Promise<ApiResponse<CpuRamSnapshot>>,
    getHardwareProfile: () =>
      ipcRenderer.invoke('system:get-hardware-profile') as Promise<ApiResponse<HardwareProfile>>
  },
  sessions: {
    saveSnapshot: (snapshot) =>
      ipcRenderer.invoke('session:save-snapshot', { snapshot }) as Promise<ApiResponse<{ success: true }>>,
    loadSnapshot: () =>
      ipcRenderer.invoke('session:load-snapshot') as Promise<ApiResponse<WorkspaceSnapshot | null>>,
    clearSnapshot: () =>
      ipcRenderer.invoke('session:clear-snapshot') as Promise<ApiResponse<{ success: true }>>
  },
  events: modeldeckEvents
};

contextBridge.exposeInMainWorld('modeldeck', modeldeckApi);
