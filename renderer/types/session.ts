import type { ChatMessage } from './message.js';
import type { ModelProvider } from './model.js';

/**
 * Adjustable prompt parameters for a session.
 */
export interface SessionParameters {
  advancedMode: boolean;
  projectMode: boolean;
  compareMode: boolean;
  compareModelIds: string[];
  lastTemplateId?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  systemPrompt: string;
  rawJsonMode: boolean;
  rawJsonPayload?: string;
}

/**
 * Runtime status for a panel session.
 */
export type SessionStatus =
  | 'idle'
  | 'streaming'
  | 'done'
  | 'error'
  | 'canceled'
  | 'loading-models';

/**
 * Persisted panel session document.
 */
export interface Session {
  id: string;
  name: string;
  modelId: string;
  provider: ModelProvider;
  messages: ChatMessage[];
  parameters: SessionParameters;
  createdAt: string;
  updatedAt: string;
}

/**
 * UI panel tracks a linked session and visual status.
 */
export interface WorkspacePanel {
  id: string;
  sessionId: string;
  status: SessionStatus;
}

/**
 * Serialized workspace payload used for persistence.
 */
export interface WorkspaceSnapshot {
  version: 1;
  layout: WorkspaceLayout;
  activePanelId?: string;
  panels: WorkspacePanel[];
  sessions: Session[];
  savedAt: string;
}

/**
 * Layout options supported by the workspace grid.
 */
export type WorkspaceLayout = 'single' | 'split' | 'quad';
