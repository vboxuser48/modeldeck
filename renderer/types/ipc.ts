import type { WorkspaceSnapshot } from './session.js';

/**
 * Standard result contract for every IPC invocation.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Model metadata exposed to the renderer from main process.
 */
export interface OllamaModel {
  id: string;
  name: string;
  size?: number;
}

/**
 * CPU and RAM telemetry snapshot from system IPC.
 */
export interface CpuRamSnapshot {
  cpuPercent: number;
  gpuPercent: number | null;
  ramUsedMb: number;
  ramTotalMb: number;
  vramUsedMb: number | null;
  vramTotalMb: number | null;
}

export interface OllamaRuntimeState {
  running: boolean;
  ready: boolean;
  activeModels: string[];
  vramUsedMb: number | null;
  vramTotalMb: number | null;
}

export interface HardwareProfile {
  ram: {
    totalBytes: number;
    freeBytes: number;
    totalGB: number;
    freeGB: number;
  };
  vram: {
    detected: boolean;
    totalBytes: number;
    totalGB: number;
    gpuName: string;
    backend: 'cuda' | 'rocm' | 'metal' | 'none';
  };
  cpu: {
    model: string;
    cores: number;
    arch: string;
  };
  platform: 'win32' | 'linux' | 'darwin';
}

/**
 * Prompt payload sent when starting a stream request.
 */
export interface StreamRequest {
  sessionId: string;
  modelId: string;
  prompt: string;
  attachments?: PromptAttachment[];
  projectMode?: ProjectModeContext;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  rawJsonPayload?: string;
}

export interface PromptAttachment {
  id: string;
  name: string;
  extension: 'txt' | 'md' | 'py' | 'js' | 'json';
  content: string;
  sizeBytes: number;
}

export interface ProjectModeContext {
  enabled: boolean;
  version: 1;
  scope: 'session' | 'workspace';
}

export interface LocalApiServerStatus {
  running: boolean;
  endpoint: string;
  modelId: string;
  pid?: number;
}

export interface LocalApiGenerateRequest {
  prompt: string;
  modelId?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * IPC event sent for each streamed token chunk.
 */
export interface StreamChunkEvent {
  sessionId: string;
  chunk: string;
}

/**
 * IPC event sent when stream finishes successfully.
 */
export interface StreamDoneEvent {
  sessionId: string;
}

/**
 * IPC event sent when stream fails.
 */
export interface StreamErrorEvent {
  sessionId: string;
  error: string;
}

export interface PullProgressEvent {
  sessionId: string;
  model: string;
  status: string;
  total?: number;
  completed?: number;
  percent: number | null;
}

export interface PullCompleteEvent {
  sessionId: string;
  model: string;
}

export interface PullErrorEvent {
  sessionId: string;
  model: string;
  error: string;
}

export interface OllamaModelInfo {
  [key: string]: unknown;
}

export type OllamaEnsureError = 'OLLAMA_NOT_INSTALLED' | 'OLLAMA_FAILED_TO_START';
export type OllamaInstallError = 'NO_TERMINAL_FOUND' | 'INSTALL_LAUNCH_FAILED';

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  ready: boolean;
  platform: 'win32' | 'linux' | 'darwin';
  installCommand: string;
}

/**
 * Event subscriptions exposed by preload.
 */
export interface ModelDeckEvents {
  onOllamaChunk: (listener: (payload: StreamChunkEvent) => void) => () => void;
  onOllamaDone: (listener: (payload: StreamDoneEvent) => void) => () => void;
  onOllamaError: (listener: (payload: StreamErrorEvent) => void) => () => void;
}

/**
 * Typed window API exposed from preload with contextBridge.
 */
export interface ModelDeckApi {
  ollama: {
    listModels: () => Promise<ApiResponse<OllamaModel[]>>;
    checkAvailability: () => Promise<ApiResponse<{ available: boolean }>>;
    status: () => Promise<ApiResponse<OllamaStatus>>;
    ensureReady: () => Promise<ApiResponse<{ ready: boolean }>>;
    install: () => Promise<ApiResponse<{ opened: boolean }>>;
    stopService: () => Promise<ApiResponse<{ stopped: boolean; unloaded: number }>>;
    streamChat: (payload: StreamRequest) => Promise<ApiResponse<{ accepted: boolean }>>;
    cancelStream: (sessionId: string) => Promise<ApiResponse<{ canceled: boolean }>>;
    pullModel: (model: string, sessionId: string) => Promise<ApiResponse<{ accepted: boolean }>>;
    cancelPull: (model: string) => Promise<ApiResponse<{ canceled: boolean }>>;
    deleteModel: (model: string) => Promise<ApiResponse<{ deleted: boolean }>>;
    getModelInfo: (model: string) => Promise<ApiResponse<OllamaModelInfo>>;
    getRuntimeState: () => Promise<ApiResponse<OllamaRuntimeState>>;
    restartModel: (model: string) => Promise<ApiResponse<{ restarted: boolean }>>;
    keepWarm: (model: string, enabled: boolean) => Promise<ApiResponse<{ success: boolean }>>;
    onPullProgress: (listener: (payload: PullProgressEvent) => void) => void;
    onPullComplete: (listener: (payload: PullCompleteEvent) => void) => void;
    onPullError: (listener: (payload: PullErrorEvent) => void) => void;
    offPullListeners: () => void;
  };
  api: {
    startLocalServer: (payload: { modelId: string; port?: number }) => Promise<ApiResponse<LocalApiServerStatus>>;
    stopLocalServer: () => Promise<ApiResponse<LocalApiServerStatus>>;
    getLocalServerStatus: () => Promise<ApiResponse<LocalApiServerStatus>>;
    generateLocal: (payload: LocalApiGenerateRequest) => Promise<ApiResponse<{ text: string }>>;
  };
  system: {
    getCpuRam: () => Promise<ApiResponse<CpuRamSnapshot>>;
    getHardwareProfile: () => Promise<ApiResponse<HardwareProfile>>;
  };
  sessions: {
    saveSnapshot: (snapshot: WorkspaceSnapshot) => Promise<ApiResponse<{ success: true }>>;
    loadSnapshot: () => Promise<ApiResponse<WorkspaceSnapshot | null>>;
    clearSnapshot: () => Promise<ApiResponse<{ success: true }>>;
  };
  events: ModelDeckEvents;
}
