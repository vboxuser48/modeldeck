/**
 * Supported message roles for panel conversations.
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Chat message for one panel session.
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  error?: string;
  metadata?: Record<string, unknown>;
}
