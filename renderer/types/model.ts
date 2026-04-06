/**
 * Supported model providers in ModelDeck.
 */
export type ModelProvider = 'ollama';

/**
 * A model that can be selected in a panel session.
 */
export interface ModelDescriptor {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow?: number;
}

/**
 * Ollama model details surfaced from /api/tags.
 */
export interface OllamaModelTag {
  name: string;
  model: string;
  size: number;
  digest: string;
  modified_at: string;
}

export type ModelTag =
  | 'coding'
  | 'chat'
  | 'reasoning'
  | 'multilingual'
  | 'fast'
  | 'large'
  | 'vision'
  | 'embedding';

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface CatalogModel {
  id: string;
  name: string;
  family: string;
  publisher: string;
  paramsBillion: number;
  diskGB: number;
  ramRequiredGB: number;
  cpuRamRequiredGB?: number;
  gpuVramRequiredGB?: number;
  tags: ModelTag[];
  description: string;
  contextLength: number;
  license: 'open' | 'restricted';
  quantization: string;
}
